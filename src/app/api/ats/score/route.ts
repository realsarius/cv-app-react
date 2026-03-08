import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateAtsScore } from '@/lib/ats/scoring';
import { resumeContentSchema } from '@/features/resume-editor/content';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const requestSchema = z.object({
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

  return NextResponse.json(score);
}
