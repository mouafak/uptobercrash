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
 * `request.ip` n'existe plus en Next 16. On lit donc les en-têtes, ce qui
 * suppose que le proxy inverse réécrit `x-forwarded-for` au lieu de laisser
 * passer celui du client — sans quoi la limite se contourne en une ligne.
 * C'est la configuration Nginx de l'étape 12 qui rend cette valeur digne de foi.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first !== undefined && first !== '') return first;

  return request.headers.get('x-real-ip') ?? 'unknown';
}
