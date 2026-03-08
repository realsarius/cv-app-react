import { desc, eq } from 'drizzle-orm';
import { resumes } from '@/db/schema';
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

export async function createDraftResume(userId: string, title?: string) {
  const [createdResume] = await withUserRls(userId, async (tx) =>
    tx
      .insert(resumes)
      .values({
        userId,
        title: title?.trim() || 'Untitled Resume',
        status: 'draft',
        currentVersionNo: 1,
      })
      .returning({
        id: resumes.id,
        title: resumes.title,
        status: resumes.status,
        updatedAt: resumes.updatedAt,
      })
  );

  return createdResume;
}
