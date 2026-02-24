import { PrismaClient } from '@kidoo/shared/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Créer l'adapter PostgreSQL avec la DATABASE_URL
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Normaliser sslmode pour éviter le warning pg v9 (prefer/require/verify-ca → verify-full)
// https://www.postgresql.org/docs/current/libpq-ssl.html
const deprecatedSslModes = ['prefer', 'require', 'verify-ca'];
for (const mode of deprecatedSslModes) {
  connectionString = connectionString.replace(
    new RegExp(`sslmode=${mode}(?=&|$)`, 'gi'),
    'sslmode=verify-full'
  );
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
