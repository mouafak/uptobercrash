import { existsSync } from 'node:fs';

import { defineConfig, env } from '@prisma/config';

// Prisma 7 ne charge plus .env tout seul. Node sait le faire depuis la 20.12 ;
// le fichier est absent en CI et en production, où les variables viennent de
// l'environnement, d'où le test d'existence.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
