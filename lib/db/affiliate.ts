import type { Affiliate } from '@prisma/client';

import { deriveAffiliateCode } from '@/core/affiliate';
import { prisma } from '@/prisma';

/**
 * Accès à la table des affiliés.
 *
 * La commission n'apparaît nulle part ici : elle se calcule à partir du total
 * parrainé et de la configuration, par `core/rules.ts`. Une commission stockée
 * est une commission qui peut diverger de sa propre règle.
 */

export type { Affiliate };

export type AffiliateStats = {
  purchaseCount: number;
  totalLamports: bigint;
};

export function getAffiliateByWallet(
  walletAddress: string,
): Promise<Affiliate | null> {
  return prisma.affiliate.findUnique({ where: { walletAddress } });
}

export function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  return prisma.affiliate.findUnique({ where: { code } });
}

/**
 * Crée l'affilié, ou rend celui qui existe déjà.
 *
 * Le code étant dérivé de l'adresse, deux appels successifs produisent le même,
 * et l'`upsert` sans champ à mettre à jour rend l'opération idempotente.
 */
export function createAffiliate(walletAddress: string): Promise<Affiliate> {
  return prisma.affiliate.upsert({
    where: { walletAddress },
    update: {},
    create: { code: deriveAffiliateCode(walletAddress), walletAddress },
  });
}

/** Nombre d'achats parrainés et total en lamports, agrégés par la base. */
export async function getAffiliateStats(code: string): Promise<AffiliateStats> {
  const stats = await prisma.purchase.aggregate({
    where: { affiliateCode: code },
    _count: { _all: true },
    _sum: { lamports: true },
  });

  return {
    purchaseCount: stats._count._all,
    totalLamports: stats._sum.lamports ?? 0n,
  };
}
