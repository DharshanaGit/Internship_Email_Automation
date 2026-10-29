import { PrismaClient } from '@prisma/client';

export function getOptimalDatabaseUrl(rawUrl = process.env.DATABASE_URL) {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    // Supabase pooler on port 5432 operates in session mode (limited to 15 concurrent clients: EMAXCONNSESSION).
    // In serverless (Vercel) & high-concurrency environments, session connections exhaust rapidly, causing:
    // "Can't reach database server at aws-0-ap-southeast-1.pooler.supabase.com:5432".
    // Automatically rewrite to port 6543 (transaction mode pooler) with pgbouncer=true & connection_limit=1.
    if (url.hostname.includes('pooler.supabase.com')) {
      if (url.port === '5432' || !url.port) {
        url.port = '6543';
      }
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1');
      }
      return url.toString();
    }
  } catch {
    // If URL parsing fails, return raw string
  }
  return rawUrl;
}

const optimalUrl = getOptimalDatabaseUrl();

if (optimalUrl && process.env.DATABASE_URL !== optimalUrl) {
  process.env.DATABASE_URL = optimalUrl;
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: optimalUrl ? { db: { url: optimalUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

