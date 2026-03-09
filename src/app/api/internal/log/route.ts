import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LOGGING_ENABLED } from '@/config/logging';
import { logger } from '@/lib/logging/logger';

const requestLogSchema = z.object({
  type: z.literal('request'),
  traceId: z.string().trim().min(8).max(128),
  userId: z.string().uuid().nullable().optional(),
  method: z.string().trim().min(3).max(10),
  path: z.string().trim().min(1).max(500),
  statusCode: z.number().int().min(100).max(599).optional(),
  durationMs: z.number().int().min(0).max(300_000).optional(),
  ip: z.string().trim().max(128).nullable().optional(),
  userAgent: z.string().trim().max(2048).nullable().optional(),
  locale: z.string().trim().max(10).nullable().optional(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!LOGGING_ENABLED) {
    return NextResponse.json({ ok: true });
  }

  const internalSecret = process.env.INTERNAL_LOG_SECRET;
  if (!internalSecret) {
    return NextResponse.json(
      {
        error: 'Internal logging secret is not configured.',
      },
      { status: 503 }
    );
  }

  const secret = request.headers.get('x-internal-secret');
  if (secret !== internalSecret) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestLogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid payload',
      },
      { status: 400 }
    );
  }

  await logger.request(parsed.data);

  return NextResponse.json({ ok: true });
}
