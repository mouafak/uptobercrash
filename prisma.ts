import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { serverEnv } from '@/config/env';

/**
 * Client Prisma unique.
 *
 * Prisma 7 exige un adaptateur de pilote : l'URL ne vit plus dans le schéma,
 * elle est passée ici. En développement, l'instance est mise en cache sur
 * `globalThis` — sans quoi chaque rechargement à chaud ouvrirait un nouveau
 * pool de connexions jusqu'à saturer PostgreSQL.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
