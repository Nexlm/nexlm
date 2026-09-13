import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Reuse a single client across nodemon reloads to avoid exhausting connections.
export const prisma =
  globalForPrisma.__nexlmPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__nexlmPrisma = prisma;
}
