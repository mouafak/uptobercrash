import { createHash } from 'node:crypto';

/**
 * Codes d'affiliation.
 *
 * Le code est dérivé de l'adresse, jamais tiré au hasard : la même adresse
 * produit toujours le même code, ce qui rend `createAffiliate` idempotent et
 * permet de retrouver un code perdu sans le stocker deux fois.
 */

const CODE_LENGTH = 8;
const CODE_FORMAT = new RegExp(`^[0-9a-f]{${CODE_LENGTH}}$`);

export function deriveAffiliateCode(walletAddress: string): string {
  return createHash('sha256')
    .update(walletAddress)
    .digest('hex')
    .slice(0, CODE_LENGTH);
}

export function isValidAffiliateCodeFormat(code: string): boolean {
  return CODE_FORMAT.test(code);
}
