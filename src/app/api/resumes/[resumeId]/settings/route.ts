import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isDatabaseConfigured } from '@/lib/db/env';
import { upsertResumeSettings } from '@/lib/db/resume-settings';
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
        error: 'Supabase ortam degiskenleri eksik.',
      },
      { status: 503 }
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'DATABASE_URL veya DATABASE_DEV_URL tanimli degil.',
      },
      { status: 503 }
    );
  }

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      {
        error: 'resumeId formati gecersiz.',
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
        error: 'Yetkisiz istek.',
      },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = settingsSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: 'Gonderilen ayar formati gecersiz.',
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
        error: 'Resume bulunamadi.',
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    settings: {
      ...savedSettings,
      updatedAt: savedSettings.updatedAt.toISOString(),
    },
  });
}
