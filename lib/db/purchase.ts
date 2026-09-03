import { Prisma } from '@prisma/client';
import type { Purchase } from '@prisma/client';

import type { Result } from '@/core/errors';
import { prisma } from '@/prisma';

/**
 * Accès à la table des achats.
 *
 * Cette table est en écriture seule : aucune fonction de ce fichier ne fait
 * d'`update` ni de `delete`. Les totaux sont agrégés par SQL, jamais en
 * chargeant les lignes pour les additionner en mémoire.
 */

export type { Purchase };

export type NewPurchase = {
  walletAddress: string;
  lamports: bigint;
  tokenBaseUnits: bigint;
  tokensPerSol: bigint;
  txHash: string;
  slot: bigint;
  blockTime: Date;
  affiliateCode: string | null;
};

export type WalletTotals = {
  totalLamports: bigint;
  totalTokens: bigint;
};

/** Code Prisma d'une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = 'P2002';

/**
 * Enregistre un achat. La contrainte d'unicité sur `txHash` est le dernier
 * rempart contre le rejeu : sa violation n'est pas une anomalie mais un cas
 * nominal — deux envois de la même signature — traduit en `ALREADY_RECORDED`
 * plutôt que laissé remonter en exception.
 */
export async function insertPurchase(
  data: NewPurchase,
): Promise<Result<Purchase>> {
  try {
    const purchase = await prisma.purchase.create({ data });
    return { ok: true, data: purchase };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return {
        ok: false,
        code: 'ALREADY_RECORDED',
        message: 'Cette transaction est déjà enregistrée.',
      };
    }
    throw error;
  }
}

export function findPurchaseByTxHash(txHash: string): Promise<Purchase | null> {
  return prisma.purchase.findUnique({ where: { txHash } });
}

/** Totaux d'un portefeuille, agrégés par la base. */
export async function getWalletTotals(
  walletAddress: string,
): Promise<WalletTotals> {
  const totals = await prisma.purchase.aggregate({
    where: { walletAddress },
    _sum: { lamports: true, tokenBaseUnits: true },
  });

  return {
    totalLamports: totals._sum.lamports ?? 0n,
    totalTokens: totals._sum.tokenBaseUnits ?? 0n,
  };
}

/** Slot le plus élevé enregistré, ou zéro si la table est vide. */
export async function getLatestSlot(): Promise<bigint> {
  const result = await prisma.purchase.aggregate({ _max: { slot: true } });
  return result._max.slot ?? 0n;
}
