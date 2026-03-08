import { and, eq, sql } from 'drizzle-orm';
import { resumeVersions, resumes } from '@/db/schema';
import {
  parseResumeContent,
  type ResumeContent,
} from '@/features/resume-editor/content';
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
};

export type SaveResumeEditorInput = {
  title?: string;
  content: ResumeContent;
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

    return {
      resume,
      content: parseResumeContent(version?.content),
    };
  });
}

export async function saveResumeEditorState(
  userId: string,
  resumeId: string,
  input: SaveResumeEditorInput
) {
  return withUserRls(userId, async (tx) => {
    const [resume] = await tx
      .select({
        id: resumes.id,
        title: resumes.title,
        currentVersionNo: resumes.currentVersionNo,
      })
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .limit(1);

    if (!resume) {
      return null;
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

    return updatedResume;
  });
}
