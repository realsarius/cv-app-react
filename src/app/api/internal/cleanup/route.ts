import { lt, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { DATA_RETENTION_DAYS } from '@/config/retention';
import { auditLogs, authEvents, requestLogs } from '@/db/schema';
import { getDb } from '@/lib/db/client';

export const runtime = 'nodejs';

function resolveCutoff(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function isAuthorized(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return false;
  }

  return secret === expectedSecret;
}

async function countRowsBeforeDelete() {
  const db = getDb();
  const requestLogsCutoff = resolveCutoff(DATA_RETENTION_DAYS.requestLogs);
  const auditLogsCutoff = resolveCutoff(DATA_RETENTION_DAYS.auditLogs);
  const authEventsCutoff = resolveCutoff(DATA_RETENTION_DAYS.authEvents);

  const [requestLogsCount] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(requestLogs)
    .where(lt(requestLogs.createdAt, requestLogsCutoff));

  const [auditLogsCount] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(lt(auditLogs.createdAt, auditLogsCutoff));

  const [authEventsCount] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(authEvents)
    .where(lt(authEvents.createdAt, authEventsCutoff));

  await db.delete(requestLogs).where(lt(requestLogs.createdAt, requestLogsCutoff));
  await db.delete(auditLogs).where(lt(auditLogs.createdAt, auditLogsCutoff));
  await db.delete(authEvents).where(lt(authEvents.createdAt, authEventsCutoff));

  return {
    requestLogsDeleted: requestLogsCount?.count ?? 0,
    auditLogsDeleted: auditLogsCount?.count ?? 0,
    authEventsDeleted: authEventsCount?.count ?? 0,
    cutoffs: {
      requestLogs: requestLogsCutoff.toISOString(),
      auditLogs: auditLogsCutoff.toISOString(),
      authEvents: authEventsCutoff.toISOString(),
    },
  };
}

async function handleCleanup(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  const summary = await countRowsBeforeDelete();
  return NextResponse.json({
    ok: true,
    retentionDays: DATA_RETENTION_DAYS,
    ...summary,
  });
}

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}

