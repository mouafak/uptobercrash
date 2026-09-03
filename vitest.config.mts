import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Vitest ne lit pas les chemins de tsconfig : l'alias est redéclaré ici pour
  // que `core/` importe la configuration comme le reste du projet.
  resolve: {
    alias: { '@': resolve(root) },
  },
  test: {
    environment: 'node',
    include: ['core/**/*.test.ts'],
  },
});
