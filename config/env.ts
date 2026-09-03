import { z } from 'zod';

/**
 * Validation des variables d'environnement, effectuée une seule fois à
 * l'import de ce module. Une variable manquante fait échouer le démarrage avec
 * un message qui la nomme, plutôt que de produire un `undefined` silencieux
 * découvert trois couches plus bas.
 *
 * Ce projet ne signe aucune transaction : aucune de ces variables ne contient,
 * ni ne doit contenir, de clé privée.
 */

/** Alphabet base58 de Bitcoin, utilisé par Solana : ni 0, ni O, ni I, ni l. */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

const serverSchema = z.object({
  DATABASE_URL: z.string({ error: 'manquante' }).min(1, { error: 'vide' }),
  SOLANA_RPC_URL: z.url({ error: 'manquante ou URL invalide' }),
  /**
   * Interrupteur d'arrêt. À `true`, les achats sont refusés et une bannière
   * s'affiche — sans redéploiement, un simple redémarrage suffit.
   */
  SALE_PAUSED: z
    .enum(['true', 'false'], { error: "doit valoir 'true' ou 'false'" })
    .default('false')
    .transform((value) => value === 'true'),
  /** Webhook Discord ou Telegram. Absent, les alertes sont simplement muettes. */
  ALERT_WEBHOOK_URL: z.url({ error: 'URL invalide' }).optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_DYNAMIC_ENV_ID: z
    .string({ error: 'manquante' })
    .min(1, { error: 'vide' }),
  NEXT_PUBLIC_TREASURY_ADDRESS: z
    .string({ error: 'manquante' })
    .min(32, { error: 'trop courte pour une adresse Solana' })
    .max(44, { error: 'trop longue pour une adresse Solana' })
    .regex(BASE58, { error: 'doit être une adresse base58' }),
});

type ServerEnv = z.infer<typeof serverSchema>;
type PublicEnv = z.infer<typeof publicSchema>;

function blankToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}

function parseOrThrow<T extends z.ZodType>(
  schema: T,
  values: Record<string, string | undefined>,
  scope: string,
): z.infer<T> {
  const result = schema.safeParse(values);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `  - ${issue.path.join('.')} : ${issue.message}`)
    .join('\n');

  throw new Error(
    `Variables d'environnement ${scope} invalides :\n${details}\n\n` +
      `Renseigne-les dans .env — la liste complète est dans .env.example.`,
  );
}

/**
 * Variables exposées au navigateur. Chaque `process.env.NEXT_PUBLIC_*` est
 * référencé littéralement : Next les remplace à la compilation, un accès
 * dynamique ne serait pas inliné.
 */
export const publicEnv: PublicEnv = parseOrThrow(
  publicSchema,
  {
    NEXT_PUBLIC_DYNAMIC_ENV_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
    NEXT_PUBLIC_TREASURY_ADDRESS: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  },
  'publiques',
);

/**
 * Variables serveur, validées côté serveur uniquement. Ce module est aussi
 * importé par des composants client, où `process.env.DATABASE_URL` n'existe
 * pas : valider sans condition y ferait lever une erreur pendant le rendu, donc
 * une page blanche. Dans le navigateur, l'objet existe mais tout accès à un de
 * ses champs lève une erreur nommant le champ fautif.
 */
export const serverEnv: ServerEnv =
  typeof window === 'undefined'
    ? parseOrThrow(
        serverSchema,
        {
          DATABASE_URL: process.env.DATABASE_URL,
          SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
          // Une variable présente mais vide vaut absente : `SALE_PAUSED=`
          // dans un .env doit retomber sur le défaut, pas faire échouer.
          SALE_PAUSED: blankToUndefined(process.env.SALE_PAUSED),
          ALERT_WEBHOOK_URL: blankToUndefined(process.env.ALERT_WEBHOOK_URL),
        },
        'serveur',
      )
    : new Proxy({} as ServerEnv, {
        get(_target, key) {
          throw new Error(
            `serverEnv.${String(key)} est une variable serveur : elle n'est ` +
              `pas lisible depuis le navigateur. Utilise publicEnv.`,
          );
        },
      });
