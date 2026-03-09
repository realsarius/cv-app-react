import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/db/env';
import { getUserDataExport } from '@/lib/db/kvkk';
import { getRequestMessages } from '@/lib/i18n/request-messages';
import { AUDIT_ACTIONS } from '@/lib/logging/actions';
import { logger } from '@/lib/logging/logger';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const messages = getRequestMessages(request);

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: messages.common.supabaseEnvMissing,
      },
      { status: 503 }
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: messages.common.databaseUrlMissing,
      },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: messages.common.unauthorizedRequest,
      },
      { status: 401 }
    );
  }

  const traceId = resolveTraceId(request.headers);
  const clientInfo = getClientInfo(request.headers, new URL(request.url).pathname);
  const exportedAt = new Date().toISOString();
  const data = await getUserDataExport(user.id);

  await logger.audit({
    traceId,
    userId: user.id,
    action: AUDIT_ACTIONS.DATA_EXPORT_REQUESTED,
    resourceType: 'user',
    resourceId: user.id,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    metadata: {
      exportedAt,
      resumeCount: data.resumes.length,
    },
  });

  return NextResponse.json(
    {
      exportedAt,
      data,
    },
    {
      headers: {
        'cache-control': 'no-store',
      },
    }
  );
}

