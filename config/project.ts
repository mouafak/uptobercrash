/**
 * Source de vérité unique des valeurs métier du projet.
 *
 * Aucune de ces valeurs ne doit être réécrite ailleurs : ni dans un composant,
 * ni dans un texte d'interface, ni dans un commentaire. Changer de projet, c'est
 * ne changer que ce fichier.
 */

export const PROJECT = {
  name: 'Uptober Crash',
  tokenName: 'Uptober Crash',
  tokenSymbol: 'UP',
  tokenDecimals: 9,
  homeUrl: 'https://uptobercrash.com',
  appUrl: 'https://privatesale.uptobercrash.com',
} as const;

/** 1 token = 10^tokenDecimals unités de base. */
const TOKEN_UNIT = 10n ** BigInt(PROJECT.tokenDecimals);

export const SALE = {
  /** 1 SOL = 10 UP, exprimé en unités de base de token. */
  tokensPerSol: 10n * TOKEN_UNIT,
  /** Achat minimum : 0,5 SOL. */
  minLamports: 500_000_000n,
  /** Aucun plafond d'achat sur ce projet. */
  maxLamports: null as bigint | null,
  /** Fin de la vente : 1er octobre 2026 à 00:00 UTC. */
  endsAt: new Date('2026-10-01T00:00:00Z'),
} as const;

export const AFFILIATE = {
  /** 10 %, en points de base. 10000 points de base = 100 %. */
  commissionBasisPoints: 1000,
} as const;
