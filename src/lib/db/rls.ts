import { sql } from 'drizzle-orm';
import { getDb } from './client';

type Db = ReturnType<typeof getDb>;
type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0];

export async function withUserRls<T>(
  userId: string,
  callback: (tx: DbTransaction) => Promise<T>
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claim.sub', ${userId}, true)`);
    return callback(tx);
  });
}
