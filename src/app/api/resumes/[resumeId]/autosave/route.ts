import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveResumeEditorState } from '@/lib/db/resume-editor';
import { isDatabaseConfigured } from '@/lib/db/env';
import { resumeContentSchema } from '@/features/resume-editor/content';
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
  const parsedBody = autosaveBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: 'Gonderilen veri formati gecersiz.',
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
        error: 'Resume bulunamadi.',
      },
      { status: 404 }
    );
  }

  if (savedResume.status === 'conflict') {
    return NextResponse.json(
      {
        error:
          'Resume baska bir oturumda guncellendi. Lutfen sayfayi yenileyip degisiklikleri tekrar uygulayin.',
        code: 'write_conflict',
        currentVersionNo: savedResume.currentVersionNo,
        currentUpdatedAt: savedResume.currentUpdatedAt.toISOString(),
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    resumeId: savedResume.resume.id,
    title: savedResume.resume.title,
    currentVersionNo: savedResume.resume.currentVersionNo,
    updatedAt: savedResume.resume.updatedAt.toISOString(),
  });
}
