import type { ErrorCode, Result } from '@/core/errors';

/**
 * Traduction des codes métier en statuts HTTP, et sérialisation des réponses.
 *
 * Le `Record` est exhaustif : ajouter un `ErrorCode` sans lui donner de statut
 * casse la compilation, ce qui évite qu'un nouveau cas d'erreur ne parte
 * silencieusement en 200.
 */
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_BODY: 400,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,

  INVALID_DECIMAL_STRING: 400,
  TOO_MANY_DECIMALS: 400,
  AMOUNT_OUT_OF_RANGE: 400,

  SALE_CLOSED: 403,
  SALE_PAUSED: 503,

  INVALID_SIGNATURE: 400,
  TX_NOT_FOUND: 404,
  TX_FAILED: 400,
  NO_TRANSFER_TO_TREASURY: 400,
  MISSING_BLOCK_TIME: 502,
  TX_AMOUNT_UNREADABLE: 400,
  RPC_UNAVAILABLE: 503,

  ALREADY_RECORDED: 409,
  NO_PURCHASE_FOUND: 403,
};

export function statusForCode(code: ErrorCode): number {
  return STATUS_BY_CODE[code];
}

/**
 * Toute réponse suit le type `Result`. Les `BigInt` sont convertis en chaînes
 * par l'appelant avant d'arriver ici : `JSON.stringify` ne sait pas les
 * sérialiser et lèverait une TypeError.
 */
export function jsonOk<T>(data: T, status = 200): Response {
  const body: Result<T> = { ok: true, data };
  return Response.json(body, { status });
}

export function jsonError(
  code: ErrorCode,
  message: string,
  headers?: HeadersInit,
): Response {
  const body: Result<never> = { ok: false, code, message };
  return Response.json(body, { status: statusForCode(code), headers });
}
