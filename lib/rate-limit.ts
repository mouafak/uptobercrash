import { serverEnv } from '@/config/env';

/**
 * Limitation de débit en mémoire : dix requêtes par minute et par IP.
 *
 * Une `Map` suffit sur un VPS mono-instance. Elle ne survit pas à un
 * redémarrage et ne se partage pas entre processus — c'est assumé : le but est
 * de freiner un script, pas de tenir un quota comptable.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
/** Au-delà de ce nombre de clés, on purge les fenêtres expirées. */
const PRUNE_THRESHOLD = 1_000;

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

function pruneExpired(now: number): void {
  if (windows.size < PRUNE_THRESHOLD) return;
  for (const [key, window] of windows) {
    if (now >= window.resetAt) windows.delete(key);
  }
}

export function rateLimit(
  key: string,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const current = windows.get(key);

  if (current === undefined || now >= current.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    pruneExpired(now);
    return { allowed: true };
  }

  if (current.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1_000),
    };
  }

  current.count += 1;
  return { allowed: true };
}

/**
 * IP du client.
 *
 * `request.ip` n'existe plus en Next 16 : il faut lire `X-Forwarded-For`. Mais
 * cet en-tête est une *liste*, et les proxys y **ajoutent** leur vision de
 * l'appelant sans effacer ce qui précède. Traefik, que Coolify place en
 * frontal, fonctionne ainsi.
 *
 * Lire le premier segment revient donc à lire ce que le client a bien voulu
 * écrire : n'importe qui peut se fabriquer une IP différente à chaque requête
 * et effacer toute limite. On lit donc en partant de la fin.
 *
 * Avec `TRUSTED_PROXY_HOPS = 1` — un seul proxy — le segment retenu est le
 * dernier, celui que ce proxy a écrit lui-même. Avec 2, l'avant-dernier, et
 * ainsi de suite.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');

  if (forwarded !== null) {
    const segments = forwarded
      .split(',')
      .map((segment) => segment.trim())
      .filter((segment) => segment !== '');

    if (segments.length > 0) {
      // Si la chaîne est plus courte qu'annoncé — un proxy retiré, une
      // configuration erronée — on retombe sur le dernier segment. Il est
      // toujours écrit par le proxy le plus proche, donc jamais falsifiable ;
      // au pire il est trop grossier, jamais dangereux.
      const index = Math.max(segments.length - serverEnv.TRUSTED_PROXY_HOPS, 0);
      const chosen =
        segments.length >= serverEnv.TRUSTED_PROXY_HOPS
          ? segments[index]
          : segments[segments.length - 1];

      if (chosen !== undefined) return chosen;
    }
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}
