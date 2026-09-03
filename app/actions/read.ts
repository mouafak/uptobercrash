'use server';

import { commissionFor } from '@/core/rules';
import { getAffiliateByWallet, getAffiliateStats } from '@/lib/db/affiliate';
import { getWalletTotals } from '@/lib/db/purchase';

/**
 * Lectures d'affichage.
 *
 * Ces fonctions ne modifient rien et ne prennent aucune décision métier. Les
 * montants sortent en chaînes d'unités de base : le composant les reformate,
 * il ne les calcule pas.
 */

export type BalanceView = {
  totalLamports: string;
  totalTokens: string;
};

export type AffiliateView = {
  hasPurchased: boolean;
  code: string | null;
  referredPurchases: number;
  referredLamports: string;
  commissionLamports: string;
};

export async function getBalance(walletAddress: string): Promise<BalanceView> {
  const totals = await getWalletTotals(walletAddress);
  return {
    totalLamports: totals.totalLamports.toString(),
    totalTokens: totals.totalTokens.toString(),
  };
}

export async function getAffiliateState(
  walletAddress: string,
): Promise<AffiliateView> {
  const [totals, affiliate] = await Promise.all([
    getWalletTotals(walletAddress),
    getAffiliateByWallet(walletAddress),
  ]);

  if (affiliate === null) {
    return {
      hasPurchased: totals.totalLamports > 0n,
      code: null,
      referredPurchases: 0,
      referredLamports: '0',
      commissionLamports: '0',
    };
  }

  const stats = await getAffiliateStats(affiliate.code);

  return {
    hasPurchased: totals.totalLamports > 0n,
    code: affiliate.code,
    referredPurchases: stats.purchaseCount,
    referredLamports: stats.totalLamports.toString(),
    // La commission est dérivée, jamais stockée. Le calcul reste dans core/.
    commissionLamports: commissionFor(stats.totalLamports).toString(),
  };
}
