import { AFFILIATE, SALE } from '@/config/project';
import { LAMPORTS_PER_SOL, lamportsToSol } from './money';

/**
 * Règles de la vente. Toutes les opérations sont entières : on multiplie
 * d'abord, on divise ensuite, ce qui garde la précision et arrondit vers le bas
 * de façon prévisible.
 */

/** 10000 points de base = 100 %. */
const BASIS_POINTS_DENOMINATOR = 10_000n;

/** Tokens obtenus pour un montant en lamports, en unités de base de token. */
export function tokensForLamports(lamports: bigint): bigint {
  return (lamports * SALE.tokensPerSol) / LAMPORTS_PER_SOL;
}

export function isAmountValid(
  lamports: bigint,
): { ok: true } | { ok: false; reason: string } {
  if (lamports <= 0n) {
    return { ok: false, reason: 'Enter an amount' };
  }

  if (lamports < SALE.minLamports) {
    return {
      ok: false,
      reason: `Minimum purchase is ${lamportsToSol(SALE.minLamports)} SOL`,
    };
  }

  if (SALE.maxLamports !== null && lamports > SALE.maxLamports) {
    return {
      ok: false,
      reason: `Maximum purchase is ${lamportsToSol(SALE.maxLamports)} SOL`,
    };
  }

  return { ok: true };
}

export function isSaleOpen(now: Date): boolean {
  return now.getTime() < SALE.endsAt.getTime();
}

/** Commission d'affiliation, en lamports, arrondie vers le bas. */
export function commissionFor(lamports: bigint): bigint {
  return (
    (lamports * BigInt(AFFILIATE.commissionBasisPoints)) /
    BASIS_POINTS_DENOMINATOR
  );
}
