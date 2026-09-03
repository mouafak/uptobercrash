import { existsSync } from 'node:fs';

/**
 * Charge `.env` avant tout autre module.
 *
 * Ce script tourne hors de Next, qui ne s'en charge donc pas pour lui, et
 * `config/env.ts` valide les variables dès son import. Ce module doit rester
 * le premier import de `reconcile.ts` : les imports étant hissés, l'ordre du
 * fichier est le seul garant de l'ordre d'évaluation.
 */
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
