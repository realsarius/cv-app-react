import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeEditorState } from '@/lib/db/resume-editor';
import { isDatabaseConfigured } from '@/lib/db/env';
import { createResumePdf } from '@/lib/pdf/resume-export';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const paramsSchema = z.object({
  resumeId: z.string().uuid(),
});

type RouteContext = {
  params: {
    resumeId: string;
  };
};

function buildExportFileName(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${base || 'resume'}-ats`;
}

export const runtime = 'nodejs';

export async function GET(_: Request, context: RouteContext) {
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

  const editorState = await getResumeEditorState(user.id, parsedParams.data.resumeId);
  if (!editorState) {
    return NextResponse.json(
      {
        error: 'Resume bulunamadi.',
      },
      { status: 404 }
    );
  }

  const pdfBytes = await createResumePdf({
    title: editorState.resume.title,
    content: editorState.content,
    settings: editorState.settings,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="${buildExportFileName(editorState.resume.title)}.pdf"`,
    },
  });
}
