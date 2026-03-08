import { and, eq, sql } from 'drizzle-orm';
import { resumeSettings, resumeVersions, resumes } from '@/db/schema';
import {
  parseResumeContent,
  type ResumeContent,
} from '@/features/resume-editor/content';
import {
  DEFAULT_RESUME_SETTINGS,
  type ResumeVisualSettings,
} from './resume-settings';
import { withUserRls } from './rls';

export type ResumeEditorState = {
  resume: {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'archived';
    currentVersionNo: number;
    updatedAt: Date;
  };
  content: ResumeContent;
  settings: ResumeVisualSettings;
};

export type SaveResumeEditorInput = {
  title?: string;
  content: ResumeContent;
  expectedUpdatedAt?: Date;
};

export type SaveResumeEditorResult =
  | {
      status: 'saved';
      resume: {
        id: string;
        title: string;
        currentVersionNo: number;
        updatedAt: Date;
      };
    }
  | {
      status: 'conflict';
      currentVersionNo: number;
      currentUpdatedAt: Date;
    };

export async function getResumeEditorState(
  userId: string,
  resumeId: string
): Promise<ResumeEditorState | null> {
  return withUserRls(userId, async (tx) => {
    const [resume] = await tx
      .select({
        id: resumes.id,
        title: resumes.title,
        status: resumes.status,
        currentVersionNo: resumes.currentVersionNo,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .limit(1);

    if (!resume) {
      return null;
    }

    const [version] = await tx
      .select({
        content: resumeVersions.content,
      })
      .from(resumeVersions)
      .where(
        and(
          eq(resumeVersions.resumeId, resume.id),
          eq(resumeVersions.versionNo, resume.currentVersionNo)
        )
      )
      .limit(1);

    const [settings] = await tx
      .select({
        templateKey: resumeSettings.templateKey,
        fontScale: resumeSettings.fontScale,
        spacingScale: resumeSettings.spacingScale,
        colorScheme: resumeSettings.colorScheme,
        updatedAt: resumeSettings.updatedAt,
      })
      .from(resumeSettings)
      .where(eq(resumeSettings.resumeId, resume.id))
      .limit(1);

    return {
      resume,
      content: parseResumeContent(version?.content),
      settings: {
        templateKey:
          settings?.templateKey === 'ats-compact' ? 'ats-compact' : 'ats-classic',
        fontScale: Number(settings?.fontScale ?? DEFAULT_RESUME_SETTINGS.fontScale),
        spacingScale: Number(
          settings?.spacingScale ?? DEFAULT_RESUME_SETTINGS.spacingScale
        ),
        colorScheme:
          settings?.colorScheme === 'slate' || settings?.colorScheme === 'mono'
            ? settings.colorScheme
            : 'neutral',
        updatedAt: settings?.updatedAt ?? resume.updatedAt,
      },
    };
  });
}

export async function saveResumeEditorState(
  userId: string,
  resumeId: string,
  input: SaveResumeEditorInput
): Promise<SaveResumeEditorResult | null> {
  return withUserRls(userId, async (tx) => {
    const [resume] = await tx
      .select({
        id: resumes.id,
        title: resumes.title,
        currentVersionNo: resumes.currentVersionNo,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .limit(1);

    if (!resume) {
      return null;
    }

    if (
      input.expectedUpdatedAt &&
      resume.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
    ) {
      return {
        status: 'conflict',
        currentVersionNo: resume.currentVersionNo,
        currentUpdatedAt: resume.updatedAt,
      };
    }

    const nextVersionNo = resume.currentVersionNo + 1;
    const nextTitle = input.title?.trim() || resume.title;

    await tx.insert(resumeVersions).values({
      resumeId: resume.id,
      versionNo: nextVersionNo,
      content: input.content,
    });

    const [updatedResume] = await tx
      .update(resumes)
      .set({
        title: nextTitle,
        currentVersionNo: nextVersionNo,
        updatedAt: sql`now()`,
      })
      .where(eq(resumes.id, resume.id))
      .returning({
        id: resumes.id,
        title: resumes.title,
        currentVersionNo: resumes.currentVersionNo,
        updatedAt: resumes.updatedAt,
      });

    return {
      status: 'saved',
      resume: updatedResume,
    };
  });
}
