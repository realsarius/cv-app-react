import { desc, eq } from 'drizzle-orm';
import { resumeVersions, resumes } from '@/db/schema';
import { createEmptyResumeContent } from '@/features/resume-editor/content';
import { withUserRls } from './rls';

export async function listUserResumes(userId: string) {
  return withUserRls(userId, async (tx) =>
    tx
      .select({
        id: resumes.id,
        title: resumes.title,
        status: resumes.status,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.updatedAt))
  );
}

export async function createDraftResume(userId: string, title: string) {
  const createdResume = await withUserRls(userId, async (tx) => {
    const [insertedResume] = await tx
      .insert(resumes)
      .values({
        userId,
        title: title.trim(),
        status: 'draft',
        currentVersionNo: 1,
      })
      .returning({
        id: resumes.id,
        title: resumes.title,
        status: resumes.status,
        updatedAt: resumes.updatedAt,
      });

    if (!insertedResume) {
      throw new Error('RESUME_CREATE_FAILED');
    }

    await tx.insert(resumeVersions).values({
      resumeId: insertedResume.id,
      versionNo: 1,
      content: createEmptyResumeContent(),
    });

    return insertedResume;
  });

  return createdResume;
}
