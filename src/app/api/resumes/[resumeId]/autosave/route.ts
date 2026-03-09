import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveResumeEditorState } from '@/lib/db/resume-editor';
import { isDatabaseConfigured } from '@/lib/db/env';
import { resumeContentSchema } from '@/features/resume-editor/content';
import { AUDIT_ACTIONS } from '@/lib/logging/actions';
import { logger } from '@/lib/logging/logger';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import {
  buildRateLimitHeaders,
  checkRateLimit,
} from '@/lib/security/rate-limit';
import { getRequestMessages } from '@/lib/i18n/request-messages';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const paramsSchema = z.object({
  resumeId: z.string().uuid(),
});

const autosaveBodySchema = z.object({
  title: z.string().trim().max(120).optional(),
  content: resumeContentSchema,
  expectedUpdatedAt: z.string().datetime().optional(),
});

type RouteContext = {
  params: {
    resumeId: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const messages = getRequestMessages(request);
  const traceId = resolveTraceId(request.headers);
  const requestPath = new URL(request.url).pathname;
  const clientInfo = getClientInfo(request.headers, requestPath);

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

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      {
        error: messages.resume.errors.exportIdInvalid,
      },
      { status: 400 }
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

  const rateLimitResult = checkRateLimit({
    bucket: 'resume-autosave',
    identifier: `${user.id}:${parsedParams.data.resumeId}:${clientInfo.ip || 'na'}`,
    limit: 45,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: messages.resume.errors.autosaveRateLimited,
      },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = autosaveBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: messages.common.invalidPayload,
      },
      { status: 400 }
    );
  }

  const savedResume = await saveResumeEditorState(
    user.id,
    parsedParams.data.resumeId,
    {
      title: parsedBody.data.title,
      content: parsedBody.data.content,
      expectedUpdatedAt: parsedBody.data.expectedUpdatedAt
        ? new Date(parsedBody.data.expectedUpdatedAt)
        : undefined,
    }
  );

  if (!savedResume) {
    return NextResponse.json(
      {
        error: messages.resume.errors.notFound,
      },
      { status: 404 }
    );
  }

  if (savedResume.status === 'conflict') {
    return NextResponse.json(
      {
        error: messages.resume.errors.updatedInAnotherSessionDetailed,
        code: 'write_conflict',
        currentVersionNo: savedResume.currentVersionNo,
        currentUpdatedAt: savedResume.currentUpdatedAt.toISOString(),
      },
      {
        status: 409,
        headers: buildRateLimitHeaders(rateLimitResult, false),
      }
    );
  }

  await logger.audit({
    traceId,
    userId: user.id,
    action: AUDIT_ACTIONS.RESUME_AUTOSAVED,
    resourceType: 'resume',
    resourceId: parsedParams.data.resumeId,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    metadata: {
      currentVersionNo: savedResume.resume.currentVersionNo,
      updatedAt: savedResume.resume.updatedAt.toISOString(),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      resumeId: savedResume.resume.id,
      title: savedResume.resume.title,
      currentVersionNo: savedResume.resume.currentVersionNo,
      updatedAt: savedResume.resume.updatedAt.toISOString(),
    },
    {
      headers: buildRateLimitHeaders(rateLimitResult, false),
    }
  );
}
