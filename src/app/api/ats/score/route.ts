import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateAtsScore } from '@/lib/ats/scoring';
import {
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
} from '@/lib/security/rate-limit';
import {
  saveJobTargetAnalysis,
  trimJobTargetHistory,
} from '@/lib/db/job-targets';
import { isDatabaseConfigured } from '@/lib/db/env';
import { resumeContentSchema } from '@/features/resume-editor/content';
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
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'Supabase ortam degiskenleri eksik.',
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
        error: 'Yetkisiz istek.',
      },
      { status: 401 }
    );
  }

  const clientIp = extractClientIp((name) => request.headers.get(name));
  const rateLimitResult = checkRateLimit({
    bucket: 'ats-score',
    identifier: user.id || clientIp || 'anonymous',
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Cok fazla ATS analizi istegi gonderildi. Lutfen biraz sonra tekrar deneyin.',
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
        error: 'Gonderilen veri formati gecersiz.',
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
