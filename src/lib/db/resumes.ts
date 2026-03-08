import { desc, eq } from 'drizzle-orm';
import { resumes } from '@/db/schema';
import { getDb } from './client';

export async function listUserResumes(userId: string) {
  const db = getDb();

  return db
    .select({
      id: resumes.id,
      title: resumes.title,
      status: resumes.status,
      updatedAt: resumes.updatedAt,
    })
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.updatedAt));
}

export async function createDraftResume(userId: string, title?: string) {
  const db = getDb();

  const [createdResume] = await db
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
    });

  return createdResume;
}
