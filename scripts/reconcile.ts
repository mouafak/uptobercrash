// Doit rester en premier : charge .env avant que config/env.ts ne valide.
import './load-env';

import { PublicKey } from '@solana/web3.js';
import type { ConfirmedSignatureInfo } from '@solana/web3.js';

import { publicEnv } from '@/config/env';
import { PROJECT, SALE } from '@/config/project';
import { baseUnitsToDisplay, lamportsToSol } from '@/core/money';
import { isAmountValid, isSaleOpen, tokensForLamports } from '@/core/rules';
import { getLatestSlot, insertPurchase } from '@/lib/db/purchase';
import { connection } from '@/lib/solana/connection';
import { verifyPurchase } from '@/lib/solana/verify-purchase';
import { prisma } from '@/prisma';

/**
 * Réconciliation : reconstruit la table des achats depuis la chaîne.
 *
 * C'est le filet de sécurité — un achat payé mais non enregistré, parce que
 * l'onglet s'est fermé ou que l'API a bronché, est rattrapé ici. C'est aussi
 * la preuve de la décision d'architecture n°1 : si la base ne se reconstruit
 * pas à partir de la seule adresse de trésorerie, elle n'était pas une simple
 * projection de la chaîne.
 *
 * Il ne supprime jamais rien. La contrainte d'unicité sur `txHash` rend
 * l'exécution idempotente : relancer n'insère aucun doublon.
 */

/** Maximum accepté par getSignaturesForAddress. */
const PAGE_SIZE = 1_000;
/** Pause entre deux lectures de transaction, pour ménager le RPC. */
const THROTTLE_MS = 120;

type Summary = {
  examined: number;
  inserted: number;
  alreadyRecorded: number;
  failedOnChain: number;
  notAPurchase: number;
  outOfRange: number;
  outsideSale: number;
  errors: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Remonte l'historique de la trésorerie, de la plus récente à la plus
 * ancienne, et s'arrête au slot déjà connu — sauf en reconstruction totale.
 */
async function collectSignatures(
  treasury: PublicKey,
  stopAtSlot: bigint,
): Promise<ConfirmedSignatureInfo[]> {
  const collected: ConfirmedSignatureInfo[] = [];
  let before: string | undefined;

  for (; ;) {
    const page = await connection.getSignaturesForAddress(treasury, {
      before,
      limit: PAGE_SIZE,
    });
    if (page.length === 0) break;

    for (const entry of page) {
      if (BigInt(entry.slot) <= stopAtSlot) return collected;
      collected.push(entry);
    }

    before = page[page.length - 1]?.signature;
    if (before === undefined) break;
  }

  return collected;
}

async function reconcile(fromScratch: boolean): Promise<Summary> {
  const treasury = new PublicKey(publicEnv.NEXT_PUBLIC_TREASURY_ADDRESS);

  const stopAtSlot = fromScratch ? -1n : await getLatestSlot();
  console.log(`Trésorerie   : ${treasury.toBase58()}`);
  console.log(
    fromScratch
      ? 'Mode         : reconstruction totale (--from-scratch)'
      : `Mode         : incrémental, à partir du slot ${stopAtSlot}`,
  );

  const signatures = await collectSignatures(treasury, stopAtSlot);
  // De la plus ancienne à la plus récente : l'ordre d'insertion suit celui de
  // la chaîne, ce qui rend les journaux lisibles.
  signatures.reverse();

  console.log(`Signatures   : ${signatures.length} à examiner\n`);

  const summary: Summary = {
    examined: 0,
    inserted: 0,
    alreadyRecorded: 0,
    failedOnChain: 0,
    notAPurchase: 0,
    outOfRange: 0,
    outsideSale: 0,
    errors: 0,
  };

  for (const entry of signatures) {
    summary.examined += 1;
    const short = `${entry.signature.slice(0, 16)}…`;

    if (entry.err !== null) {
      summary.failedOnChain += 1;
      console.log(`  ${short}  transaction échouée sur la chaîne, ignorée`);
      continue;
    }

    try {
      const verified = await verifyPurchase(entry.signature);
      await sleep(THROTTLE_MS);

      if (!verified.ok) {
        summary.notAPurchase += 1;
        console.log(`  ${short}  ${verified.code}, ignorée`);
        continue;
      }

      const { walletAddress, lamports, slot, blockTime } = verified.data;

      // Les mêmes règles que la route d'achat, sans quoi une reconstruction
      // totale produirait une table différente de celle bâtie par l'API.
      const amount = isAmountValid(lamports);
      if (!amount.ok) {
        summary.outOfRange += 1;
        console.log(
          `  ${short}  ${lamportsToSol(lamports)} SOL hors bornes, ignorée`,
        );
        continue;
      }

      // Évaluée à l'horodatage du bloc, pas à maintenant : sinon toute
      // exécution postérieure à la clôture rejetterait la vente entière.
      if (!isSaleOpen(blockTime)) {
        summary.outsideSale += 1;
        console.log(`  ${short}  hors période de vente, ignorée`);
        continue;
      }

      const inserted = await insertPurchase({
        walletAddress,
        lamports,
        tokenBaseUnits: tokensForLamports(lamports),
        tokensPerSol: SALE.tokensPerSol,
        txHash: entry.signature,
        slot,
        blockTime,
        // Le code de parrainage n'existe pas sur la chaîne. Un achat reconstruit
        // est donc inséré sans parrain. C'est documenté dans le README.
        affiliateCode: null,
      });

      if (inserted.ok) {
        summary.inserted += 1;
        console.log(
          `  ${short}  INSÉRÉ  ${lamportsToSol(lamports)} SOL -> ` +
          `${baseUnitsToDisplay(tokensForLamports(lamports), PROJECT.tokenDecimals)} ` +
          `${PROJECT.tokenSymbol}  de ${walletAddress.slice(0, 8)}…`,
        );
      } else if (inserted.code === 'ALREADY_RECORDED') {
        summary.alreadyRecorded += 1;
        console.log(`  ${short}  déjà en base`);
      } else {
        summary.errors += 1;
        console.error(`  ${short}  ${inserted.code} — ${inserted.message}`);
      }
    } catch (error) {
      summary.errors += 1;
      console.error(
        `  ${short}  erreur inattendue :`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return summary;
}

async function main(): Promise<void> {
  try {
    const summary = await reconcile(process.argv.includes('--from-scratch'));

    console.log('\n─── Résumé ───');
    console.log(`  examinées           : ${summary.examined}`);
    console.log(`  insérées            : ${summary.inserted}`);
    console.log(`  déjà en base        : ${summary.alreadyRecorded}`);
    console.log(`  échouées on-chain   : ${summary.failedOnChain}`);
    console.log(`  pas un achat        : ${summary.notAPurchase}`);
    console.log(`  montant hors bornes : ${summary.outOfRange}`);
    console.log(`  hors vente          : ${summary.outsideSale}`);
    console.log(`  erreurs             : ${summary.errors}`);

    process.exitCode = summary.errors > 0 ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Réconciliation interrompue :', error);
  process.exitCode = 1;
});
