import { BusinessError } from './errors';

/**
 * Conversions entre chaînes lisibles et entiers en unités de base.
 *
 * Aucune de ces fonctions ne convertit un montant en flottant, à aucun moment :
 * un montant qui transite par un nombre à virgule est un montant faux en
 * puissance. Tout se fait sur des chaînes et des entiers.
 */

/** 1 SOL = 10^9 lamports. Constante du protocole Solana. */
const SOL_DECIMALS = 9;

export const LAMPORTS_PER_SOL = 10n ** BigInt(SOL_DECIMALS);

/** Entier, ou entier suivi d'un point et d'au moins un chiffre. Pas de signe. */
const DECIMAL_STRING = /^\d+(?:\.\d+)?$/;

function parseDecimal(value: string, decimals: number, unit: string): bigint {
  const trimmed = value.trim();

  if (!DECIMAL_STRING.test(trimmed)) {
    throw new BusinessError(
      'INVALID_DECIMAL_STRING',
      `"${value}" n'est pas un montant décimal valide.`,
    );
  }

  const [whole = '', fraction = ''] = trimmed.split('.');

  if (fraction.length > decimals) {
    throw new BusinessError(
      'TOO_MANY_DECIMALS',
      `Un montant en ${unit} accepte au plus ${decimals} décimales, ` +
        `${fraction.length} reçues.`,
    );
  }

  return BigInt(whole + fraction.padEnd(decimals, '0'));
}

/**
 * Convertit une saisie utilisateur en lamports, sans jamais passer par un
 * flottant : la partie décimale est complétée à droite puis concaténée.
 */
export function solToLamports(value: string): bigint {
  return parseDecimal(value, SOL_DECIMALS, 'SOL');
}

/** Rend un entier en unités de base sous forme lisible, sans zéros inutiles. */
export function baseUnitsToDisplay(v: bigint, decimals: number): string {
  const negative = v < 0n;
  const absolute = negative ? -v : v;
  const unit = 10n ** BigInt(decimals);

  const whole = absolute / unit;
  const fraction = absolute % unit;

  let out = whole.toString();
  if (fraction > 0n) {
    const digits = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    out += `.${digits}`;
  }

  return negative ? `-${out}` : out;
}

export function lamportsToSol(v: bigint): string {
  return baseUnitsToDisplay(v, SOL_DECIMALS);
}

const COMPACT_STEPS = [
  { suffix: 'T', threshold: 1_000_000_000_000n },
  { suffix: 'B', threshold: 1_000_000_000n },
  { suffix: 'M', threshold: 1_000_000n },
  { suffix: 'K', threshold: 1_000n },
] as const;

/**
 * Forme abrégée pour les grands nombres de tokens : 1.5M, 2.3B. Une seule
 * décimale, tronquée. En dessous de mille, retombe sur l'affichage complet.
 */
export function formatCompact(v: bigint, decimals: number): string {
  const unit = 10n ** BigInt(decimals);
  const whole = v / unit;

  for (const step of COMPACT_STEPS) {
    if (whole >= step.threshold) {
      const integral = whole / step.threshold;
      const tenth = ((whole % step.threshold) * 10n) / step.threshold;
      return tenth > 0n
        ? `${integral}.${tenth}${step.suffix}`
        : `${integral}${step.suffix}`;
    }
  }

  return baseUnitsToDisplay(v, decimals);
}
