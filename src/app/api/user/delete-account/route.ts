import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/db/env';
import { deleteUserData } from '@/lib/db/kvkk';
import { getRequestMessages } from '@/lib/i18n/request-messages';
import { AUDIT_ACTIONS } from '@/lib/logging/actions';
import { logger } from '@/lib/logging/logger';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function parseDeleteActivityLogs(request: NextRequest) {
  const value = new URL(request.url).searchParams.get('deleteActivityLogs');
  return value === 'true' || value === '1';
}

export async function DELETE(request: NextRequest) {
  const messages = getRequestMessages(request);

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: messages.common.supabaseEnvMissing,
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

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: messages.common.databaseUrlMissing,
      },
      { status: 503 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error: 'Supabase admin anahtari eksik.',
      },
      { status: 503 }
    );
  }

  const traceId = resolveTraceId(request.headers);
  const clientInfo = getClientInfo(request.headers, new URL(request.url).pathname);
  const deleteActivityLogs = parseDeleteActivityLogs(request);

  await logger.audit({
    traceId,
    userId: user.id,
    action: AUDIT_ACTIONS.DATA_DELETE_REQUESTED,
    resourceType: 'user',
    resourceId: user.id,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    metadata: {
      deleteActivityLogs,
    },
  });

  const deletionSummary = await deleteUserData(user.id, {
    deleteActivityLogs,
  });

  const supabaseAdmin = createSupabaseAdminClient();
  const { error: adminDeleteError } =
    await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (adminDeleteError) {
    return NextResponse.json(
      {
        error: 'Hesap kimlik kaydi silinemedi.',
        detail: adminDeleteError.message,
        deletionSummary,
      },
      { status: 502 }
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({
    ok: true,
    deletionSummary,
  });
}
