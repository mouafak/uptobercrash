import { AFFILIATE, PROJECT, SALE } from '@/config/project';
import { baseUnitsToDisplay, formatCompact, lamportsToSol } from '@/core/money';

/**
 * Unités de base vers affichage.
 *
 * Les composants passent par ici plutôt que d'appeler `core/` directement :
 * ils n'ont ainsi jamais à connaître le nombre de décimales du token.
 */

/** Au-delà d'un million de tokens, la forme longue devient illisible. */
const COMPACT_FROM = 1_000_000n * 10n ** BigInt(PROJECT.tokenDecimals);

export function formatTokens(baseUnits: bigint): string {
  return baseUnits >= COMPACT_FROM
    ? formatCompact(baseUnits, PROJECT.tokenDecimals)
    : baseUnitsToDisplay(baseUnits, PROJECT.tokenDecimals);
}

export function formatSol(lamports: bigint): string {
  return lamportsToSol(lamports);
}

/** Taux affiché dans le champ de saisie : « 1 SOL = 100 ». */
export function formatRate(): string {
  return formatTokens(SALE.tokensPerSol);
}

/** Commission d'affiliation en pourcentage, depuis les points de base. */
export function formatCommissionPercent(): string {
  return (AFFILIATE.commissionBasisPoints / 100).toString();
}
