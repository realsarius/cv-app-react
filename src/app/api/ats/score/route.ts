import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateAtsScore } from '@/lib/ats/scoring';
import { AUDIT_ACTIONS } from '@/lib/logging/actions';
import { logger } from '@/lib/logging/logger';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import {
  buildRateLimitHeaders,
  checkRateLimit,
} from '@/lib/security/rate-limit';
import {
  saveJobTargetAnalysis,
  trimJobTargetHistory,
} from '@/lib/db/job-targets';
import { isDatabaseConfigured } from '@/lib/db/env';
import { resumeContentSchema } from '@/features/resume-editor/content';
import { getRequestMessages } from '@/lib/i18n/request-messages';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const requestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  jobTitle: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  jobDescription: z.string().trim().min(50).max(30000),
  content: resumeContentSchema,
});

export async function POST(request: NextRequest) {
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
    bucket: 'ats-score',
    identifier: user.id || clientInfo.ip || 'anonymous',
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: messages.ats.errors.rateLimited,
      },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: messages.common.invalidPayload,
      },
      { status: 400 }
    );
  }

  const score = calculateAtsScore(parsed.data.content, parsed.data.jobDescription);

  let savedTarget = null;
  if (parsed.data.resumeId && isDatabaseConfigured()) {
    savedTarget = await saveJobTargetAnalysis(user.id, {
      resumeId: parsed.data.resumeId,
      jobTitle: parsed.data.jobTitle,
      company: parsed.data.company,
      jobDescription: parsed.data.jobDescription,
      score,
    });

    if (savedTarget) {
      await trimJobTargetHistory(user.id, parsed.data.resumeId, 20);
    }
  }

  await logger.audit({
    traceId,
    userId: user.id,
    action: AUDIT_ACTIONS.ATS_ANALYZED,
    resourceType: parsed.data.resumeId ? 'resume' : 'ats',
    resourceId: parsed.data.resumeId,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    metadata: {
      overallScore: score.overallScore,
      matchedKeywordCount: score.matchedKeywords.length,
      missingKeywordCount: score.missingKeywords.length,
      resumeId: parsed.data.resumeId ?? null,
    },
  });

  return NextResponse.json(
    {
      ...score,
      savedTarget,
    },
    {
      headers: buildRateLimitHeaders(rateLimitResult, false),
    }
  );
}
