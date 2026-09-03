import { SystemProgram } from '@solana/web3.js';
import type {
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
} from '@solana/web3.js';

import { publicEnv } from '@/config/env';
import type { Result } from '@/core/errors';

import { connection } from './connection';

/**
 * Lecture d'une transaction sur la chaîne, et décision : est-ce un achat valide ?
 *
 * Rien de ce que rapporte l'appelant n'est cru, hormis la signature elle-même.
 * Le montant, l'expéditeur et le destinataire sont extraits de la transaction.
 */

export type VerifiedPurchase = {
  walletAddress: string;
  lamports: bigint;
  slot: bigint;
  blockTime: Date;
};

/** Une signature fait 64 octets, soit 86 à 88 caractères en base58. */
const SIGNATURE_FORMAT = /^[1-9A-HJ-NP-Za-km-z]{86,88}$/;

/** Trois tentatives, donc deux attentes, croissantes. */
const RPC_RETRY_DELAYS_MS = [250, 1_000] as const;
const RPC_ATTEMPTS = RPC_RETRY_DELAYS_MS.length + 1;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Récupère la transaction, en retentant les seules erreurs réseau.
 *
 * Une transaction introuvable ne passe jamais par ce chemin : le RPC répond
 * `null` sans lever. C'est voulu — une signature inconnue reste inconnue, la
 * retenter ne ferait que retarder la réponse.
 */
async function fetchParsedTransaction(
  txHash: string,
): Promise<Result<ParsedTransactionWithMeta | null>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RPC_ATTEMPTS; attempt += 1) {
    try {
      const transaction = await connection.getParsedTransaction(txHash, {
        maxSupportedTransactionVersion: 0,
      });
      return { ok: true, data: transaction };
    } catch (error) {
      lastError = error;
      const delay = RPC_RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) {
        await sleep(delay);
      }
    }
  }

  return {
    ok: false,
    code: 'RPC_UNAVAILABLE',
    message:
      `Le RPC n'a pas répondu après ${RPC_ATTEMPTS} tentatives : ` +
      (lastError instanceof Error ? lastError.message : String(lastError)),
  };
}

type SystemTransfer = {
  source: string;
  destination: string;
  lamports: number;
};

/**
 * Reconnaît un transfert `system`. Le champ `parsed` de web3.js est typé `any` :
 * chaque champ est vérifié à l'exécution plutôt que casté.
 */
function readSystemTransfer(
  instruction: ParsedInstruction | PartiallyDecodedInstruction,
): SystemTransfer | null {
  if (!('parsed' in instruction)) return null;
  if (!instruction.programId.equals(SystemProgram.programId)) return null;

  const parsed: unknown = instruction.parsed;
  if (typeof parsed !== 'object' || parsed === null) return null;

  const { type, info } = parsed as { type?: unknown; info?: unknown };
  if (type !== 'transfer') return null;
  if (typeof info !== 'object' || info === null) return null;

  const { source, destination, lamports } = info as Record<string, unknown>;
  if (
    typeof source !== 'string' ||
    typeof destination !== 'string' ||
    typeof lamports !== 'number'
  ) {
    return null;
  }

  return { source, destination, lamports };
}

export async function verifyPurchase(
  txHash: string,
): Promise<Result<VerifiedPurchase>> {
  if (!SIGNATURE_FORMAT.test(txHash)) {
    return {
      ok: false,
      code: 'INVALID_SIGNATURE',
      message: "La signature fournie n'a pas le format d'une signature Solana.",
    };
  }

  const fetched = await fetchParsedTransaction(txHash);
  if (!fetched.ok) return fetched;

  const transaction = fetched.data;
  if (transaction === null) {
    return {
      ok: false,
      code: 'TX_NOT_FOUND',
      message: "Aucune transaction ne porte cette signature sur la chaîne.",
    };
  }

  if (transaction.meta === null) {
    return {
      ok: false,
      code: 'TX_FAILED',
      message:
        "La transaction est dépourvue de métadonnées : impossible d'établir " +
        "qu'elle a réussi.",
    };
  }

  if (transaction.meta.err !== null) {
    return {
      ok: false,
      code: 'TX_FAILED',
      message: `La transaction a échoué sur la chaîne : ${JSON.stringify(transaction.meta.err)}`,
    };
  }

  const treasury = publicEnv.NEXT_PUBLIC_TREASURY_ADDRESS;
  let transfer: SystemTransfer | null = null;

  for (const instruction of transaction.transaction.message.instructions) {
    const candidate = readSystemTransfer(instruction);
    if (candidate !== null && candidate.destination === treasury) {
      transfer = candidate;
      break;
    }
  }

  if (transfer === null) {
    return {
      ok: false,
      code: 'NO_TRANSFER_TO_TREASURY',
      message: "Cette transaction ne contient aucun transfert vers la trésorerie.",
    };
  }

  // Le RPC rend les lamports en nombre JavaScript : au-delà de 2^53 la valeur
  // est déjà tronquée à l'arrivée. On refuse plutôt que d'enregistrer un
  // montant faux. La conversion en BigInt suit immédiatement, et plus aucun
  // calcul ne touche au nombre.
  if (!Number.isSafeInteger(transfer.lamports)) {
    return {
      ok: false,
      code: 'TX_AMOUNT_UNREADABLE',
      message: "Le montant transféré dépasse ce que le RPC sait rendre sans perte.",
    };
  }

  if (transaction.blockTime === null || transaction.blockTime === undefined) {
    return {
      ok: false,
      code: 'MISSING_BLOCK_TIME',
      message: "La transaction n'a pas d'horodatage de bloc sur ce RPC.",
    };
  }

  return {
    ok: true,
    data: {
      walletAddress: transfer.source,
      lamports: BigInt(transfer.lamports),
      slot: BigInt(transaction.slot),
      blockTime: new Date(transaction.blockTime * 1_000),
    },
  };
}
