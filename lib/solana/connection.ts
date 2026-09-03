import { Connection } from '@solana/web3.js';

import { serverEnv } from '@/config/env';

/**
 * Connexion RPC unique, en commitment `confirmed`.
 *
 * `confirmed` suffit ici : une transaction confirmée par la supermajorité ne
 * sera pas réorganisée en pratique, et attendre `finalized` ajouterait une
 * dizaine de secondes à chaque vérification d'achat.
 */
export const connection = new Connection(serverEnv.SOLANA_RPC_URL, 'confirmed');
