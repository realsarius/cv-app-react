import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';
import { getDatabaseUrl } from './env';

const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

function getPool() {
  if (globalForDb.pool) {
    return globalForDb.pool;
  }

  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.pool = pool;
  }

  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}
