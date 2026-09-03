/**
 * Vocabulaire d'erreur commun à toutes les couches.
 *
 * Les codes sont une union de littéraux, jamais des chaînes libres : un appelant
 * doit pouvoir distinguer deux échecs sans comparer des messages.
 */

export type ErrorCode =
  // Requête
  | 'INVALID_BODY'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  // Saisie et montants
  | 'INVALID_DECIMAL_STRING'
  | 'TOO_MANY_DECIMALS'
  | 'AMOUNT_OUT_OF_RANGE'
  // Vente
  | 'SALE_CLOSED'
  | 'SALE_PAUSED'
  // Vérification on-chain
  | 'INVALID_SIGNATURE'
  | 'TX_NOT_FOUND'
  | 'TX_FAILED'
  | 'NO_TRANSFER_TO_TREASURY'
  | 'MISSING_BLOCK_TIME'
  | 'TX_AMOUNT_UNREADABLE'
  | 'RPC_UNAVAILABLE'
  // Persistance
  | 'ALREADY_RECORDED'
  | 'NO_PURCHASE_FOUND';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string };

/**
 * Erreur métier porteuse de son code. Utilisée par les fonctions dont la
 * signature impose un retour direct plutôt qu'un `Result` — `solToLamports`
 * rend un `bigint`, son seul moyen de rejeter une saisie est de lever.
 */
export class BusinessError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
  }
}
