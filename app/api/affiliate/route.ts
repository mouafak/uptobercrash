import { z } from 'zod';

import { jsonError, jsonOk } from '@/lib/http';
import { logError, logInfo, sendAlert } from '@/lib/monitoring';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createAffiliate } from '@/lib/db/affiliate';
import { getWalletTotals } from '@/lib/db/purchase';

/**
 * Attribution d'un code de parrainage.
 *
 * Réservé aux portefeuilles ayant déjà participé : sans cette condition,
 * n'importe qui pourrait générer un lien sans jamais avoir acheté.
 */

/** Alphabet base58 de Solana : ni 0, ni O, ni I, ni l. */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const bodySchema = z.object({
  walletAddress: z.string({ error: 'requise' }).regex(BASE58),
});

const SCOPE = 'api/affiliate';

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);

  const limit = rateLimit(ip);
  if (!limit.allowed) {
    logInfo(SCOPE, { ip, result: 'RATE_LIMITED' });
    return jsonError('RATE_LIMITED', 'Too many requests. Try again shortly.', {
      'Retry-After': String(limit.retryAfterSeconds),
    });
  }

  let walletAddress = '<non lu>';

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonError('INVALID_BODY', 'Request body is not valid JSON.');
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError('INVALID_BODY', 'Expected { walletAddress }.');
    }
    walletAddress = parsed.data.walletAddress;

    // Un achat vaut au moins le minimum configuré, strictement positif : un
    // total nul signifie donc qu'aucun achat n'est enregistré.
    const totals = await getWalletTotals(walletAddress);
    if (totals.totalLamports <= 0n) {
      logInfo(SCOPE, { ip, walletAddress, result: 'NO_PURCHASE_FOUND' });
      return jsonError(
        'NO_PURCHASE_FOUND',
        'You need at least one purchase before requesting an affiliate link.',
      );
    }

    const affiliate = await createAffiliate(walletAddress);
    logInfo(SCOPE, { ip, walletAddress, code: affiliate.code, result: 'ISSUED' });
    return jsonOk({ code: affiliate.code }, 200);
  } catch (error) {
    const context = {
      ip,
      walletAddress,
      result: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : String(error),
    };
    logError(SCOPE, { ...context, stack: error instanceof Error ? error.stack : undefined });
    sendAlert('Erreur 500 sur /api/affiliate', context);
    return jsonError('INTERNAL_ERROR', 'Unexpected error. Please try again.');
  }
}
