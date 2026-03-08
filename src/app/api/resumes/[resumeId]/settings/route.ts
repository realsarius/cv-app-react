import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { messages } from '@/constants/messages';
import { isDatabaseConfigured } from '@/lib/db/env';
import { upsertResumeSettings } from '@/lib/db/resume-settings';
import {
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
} from '@/lib/security/rate-limit';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const paramsSchema = z.object({
  resumeId: z.string().uuid(),
});

const settingsSchema = z.object({
  templateKey: z.enum(['ats-classic', 'ats-compact']),
  fontScale: z.number().min(0.85).max(1.3),
  spacingScale: z.number().min(0.8).max(1.4),
  colorScheme: z.enum(['neutral', 'slate', 'mono']),
});

type RouteContext = {
  params: {
    resumeId: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: `${messages.common.supabaseEnvMissing}.`,
      },
      { status: 503 }
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'DATABASE_URL veya DATABASE_DEV_URL tanımlı değil.',
      },
      { status: 503 }
    );
  }

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      {
        error: messages.resume.exportIdInvalid,
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

  const clientIp = extractClientIp((name) => request.headers.get(name));
  const rateLimitResult = checkRateLimit({
    bucket: 'resume-settings',
    identifier: `${user.id}:${parsedParams.data.resumeId}:${clientIp || 'na'}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error:
          'Çok fazla ayar kaydetme isteği gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.',
      },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = settingsSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: 'Gönderilen ayar formatı geçersiz.',
      },
      { status: 400 }
    );
  }

  const savedSettings = await upsertResumeSettings(
    user.id,
    parsedParams.data.resumeId,
    parsedBody.data
  );

  if (!savedSettings) {
    return NextResponse.json(
      {
        error: `${messages.resume.notFound}.`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      settings: {
        ...savedSettings,
        updatedAt: savedSettings.updatedAt.toISOString(),
      },
    },
    {
      headers: buildRateLimitHeaders(rateLimitResult, false),
    }
  );
}
