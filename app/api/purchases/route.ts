import { z } from 'zod';

import { serverEnv } from '@/config/env';
import { SALE } from '@/config/project';
import { isValidAffiliateCodeFormat } from '@/core/affiliate';
import { isAmountValid, isSaleOpen, tokensForLamports } from '@/core/rules';
import { jsonError, jsonOk } from '@/lib/http';
import { logError, logInfo, sendAlert } from '@/lib/monitoring';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getAffiliateByCode } from '@/lib/db/affiliate';
import type { Purchase } from '@/lib/db/purchase';
import { findPurchaseByTxHash, insertPurchase } from '@/lib/db/purchase';
import { verifyPurchase } from '@/lib/solana/verify-purchase';

/**
 * Enregistrement d'un achat.
 *
 * Le corps ne transporte qu'une signature. Le montant, l'expéditeur et le
 * destinataire sont lus sur la chaîne : tout champ supplémentaire présent dans
 * la requête est écarté par le schéma, jamais consulté.
 *
 * Chaque appel produit une ligne de journal structurée, quel qu'en soit l'issue.
 */

const SCOPE = 'api/purchases';

const bodySchema = z.object({
  txHash: z.string({ error: 'requis' }),
  affiliateCode: z.string().nullish(),
});

type PurchasePayload = {
  txHash: string;
  walletAddress: string;
  lamports: string;
  tokenBaseUnits: string;
  tokensPerSol: string;
  affiliateCode: string | null;
};

/** Les BigInt sont convertis en chaînes : JSON ne sait pas les représenter. */
function toPayload(purchase: Purchase): PurchasePayload {
  return {
    txHash: purchase.txHash,
    walletAddress: purchase.walletAddress,
    lamports: purchase.lamports.toString(),
    tokenBaseUnits: purchase.tokenBaseUnits.toString(),
    tokensPerSol: purchase.tokensPerSol.toString(),
    affiliateCode: purchase.affiliateCode,
  };
}

/**
 * Résout le code de parrainage. Un code inconnu ou mal formé est ignoré
 * silencieusement : il ne doit jamais faire échouer un achat déjà payé. Un code
 * appartenant à l'acheteur lui-même est ignoré aussi — on ne se parraine pas.
 */
async function resolveAffiliateCode(
  code: string | null | undefined,
  buyer: string,
): Promise<string | null> {
  if (code === null || code === undefined || code === '') return null;
  if (!isValidAffiliateCodeFormat(code)) return null;

  const affiliate = await getAffiliateByCode(code);
  if (affiliate === null) return null;
  if (affiliate.walletAddress === buyer) return null;

  return affiliate.code;
}

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);

  const limit = rateLimit(ip);
  if (!limit.allowed) {
    logInfo(SCOPE, { ip, result: 'RATE_LIMITED' });
    return jsonError('RATE_LIMITED', 'Too many requests. Try again shortly.', {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  let txHash = '<non lu>';

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      logInfo(SCOPE, { ip, result: 'INVALID_BODY', reason: 'JSON illisible' });
      return jsonError('INVALID_BODY', 'Request body is not valid JSON.');
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      logInfo(SCOPE, { ip, result: 'INVALID_BODY', reason: 'schéma' });
      return jsonError('INVALID_BODY', 'Expected { txHash, affiliateCode }.');
    }
    txHash = parsed.data.txHash;

    // Interrupteur d'arrêt : coupe les achats sans redéploiement.
    if (serverEnv.SALE_PAUSED) {
      logInfo(SCOPE, { ip, txHash, result: 'SALE_PAUSED' });
      return jsonError('SALE_PAUSED', 'Purchases are temporarily paused.');
    }

    if (!isSaleOpen(new Date())) {
      logInfo(SCOPE, { ip, txHash, result: 'SALE_CLOSED' });
      return jsonError('SALE_CLOSED', 'The sale is closed.');
    }

    // Idempotence : un double envoi rend l'achat déjà enregistré, pas une erreur.
    const existing = await findPurchaseByTxHash(txHash);
    if (existing !== null) {
      logInfo(SCOPE, {
        ip,
        txHash,
        walletAddress: existing.walletAddress,
        lamports: existing.lamports.toString(),
        result: 'ALREADY_RECORDED',
      });
      return jsonOk(toPayload(existing), 200);
    }

    const verified = await verifyPurchase(txHash);
    if (!verified.ok) {
      logError(SCOPE, {
        ip,
        txHash,
        result: verified.code,
        message: verified.message,
      });
      sendAlert('Échec de vérification on-chain', {
        txHash,
        code: verified.code,
        message: verified.message,
        ip,
      });
      return jsonError(verified.code, verified.message);
    }

    const { walletAddress, lamports, slot, blockTime } = verified.data;

    const amount = isAmountValid(lamports);
    if (!amount.ok) {
      logError(SCOPE, {
        ip,
        txHash,
        walletAddress,
        lamports: lamports.toString(),
        result: 'AMOUNT_OUT_OF_RANGE',
        message: amount.reason,
      });
      return jsonError('AMOUNT_OUT_OF_RANGE', amount.reason);
    }

    const affiliateCode = await resolveAffiliateCode(
      parsed.data.affiliateCode,
      walletAddress,
    );

    const inserted = await insertPurchase({
      walletAddress,
      lamports,
      tokenBaseUnits: tokensForLamports(lamports),
      tokensPerSol: SALE.tokensPerSol,
      txHash,
      slot,
      blockTime,
      affiliateCode,
    });

    if (!inserted.ok) {
      // Course entre deux requêtes simultanées : la contrainte d'unicité a
      // tranché, l'achat existe. On rend celui qui a gagné.
      if (inserted.code === 'ALREADY_RECORDED') {
        const winner = await findPurchaseByTxHash(txHash);
        if (winner !== null) {
          logInfo(SCOPE, {
            ip,
            txHash,
            walletAddress,
            lamports: lamports.toString(),
            result: 'ALREADY_RECORDED',
          });
          return jsonOk(toPayload(winner), 200);
        }
      }
      logError(SCOPE, {
        ip,
        txHash,
        result: inserted.code,
        message: inserted.message,
      });
      return jsonError(inserted.code, inserted.message);
    }

    logInfo(SCOPE, {
      ip,
      txHash,
      walletAddress,
      lamports: lamports.toString(),
      tokenBaseUnits: inserted.data.tokenBaseUnits.toString(),
      affiliateCode,
      slot: slot.toString(),
      result: 'RECORDED',
    });

    return jsonOk(toPayload(inserted.data), 201);
  } catch (error) {
    const context = {
      ip,
      txHash,
      result: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : String(error),
    };
    logError(SCOPE, { ...context, stack: error instanceof Error ? error.stack : undefined });
    sendAlert('Erreur 500 sur /api/purchases', context);
    return jsonError('INTERNAL_ERROR', 'Unexpected error. Please try again.');
  }
}
