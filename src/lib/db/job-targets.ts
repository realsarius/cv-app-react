import { and, desc, eq, inArray } from 'drizzle-orm';
import { jobTargets, resumes } from '@/db/schema';
import type { AtsScoreResult } from '@/lib/ats/scoring';
import { withUserRls } from './rls';

export type JobTargetHistoryItem = {
  id: string;
  resumeId: string;
  jobTitle: string | null;
  company: string | null;
  lastScore: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  algorithmVersion: string | null;
  updatedAt: Date;
};

type SaveJobTargetInput = {
  resumeId: string;
  jobTitle?: string;
  company?: string;
  jobDescription: string;
  score: AtsScoreResult;
};

export async function saveJobTargetAnalysis(
  userId: string,
  input: SaveJobTargetInput
): Promise<JobTargetHistoryItem | null> {
  return withUserRls(userId, async (tx) => {
    const [resume] = await tx
      .select({
        id: resumes.id,
      })
      .from(resumes)
      .where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, userId)))
      .limit(1);

    if (!resume) {
      return null;
    }

    const [created] = await tx
      .insert(jobTargets)
      .values({
        resumeId: input.resumeId,
        jobTitle: input.jobTitle?.trim() || null,
        company: input.company?.trim() || null,
        jobDescription: input.jobDescription,
        lastScore: input.score.overallScore.toString(),
        matchedKeywords: input.score.matchedKeywords,
        missingKeywords: input.score.missingKeywords,
        suggestions: input.score.suggestions,
        algorithmVersion: input.score.algorithmVersion,
      })
      .returning({
        id: jobTargets.id,
        resumeId: jobTargets.resumeId,
        jobTitle: jobTargets.jobTitle,
        company: jobTargets.company,
        lastScore: jobTargets.lastScore,
        matchedKeywords: jobTargets.matchedKeywords,
        missingKeywords: jobTargets.missingKeywords,
        suggestions: jobTargets.suggestions,
        algorithmVersion: jobTargets.algorithmVersion,
        updatedAt: jobTargets.updatedAt,
      });

    if (!created) {
      return null;
    }

    return {
      id: created.id,
      resumeId: created.resumeId,
      jobTitle: created.jobTitle,
      company: created.company,
      lastScore: created.lastScore === null ? null : Number(created.lastScore),
      matchedKeywords: Array.isArray(created.matchedKeywords)
        ? created.matchedKeywords
        : [],
      missingKeywords: Array.isArray(created.missingKeywords)
        ? created.missingKeywords
        : [],
      suggestions: Array.isArray(created.suggestions) ? created.suggestions : [],
      algorithmVersion: created.algorithmVersion,
      updatedAt: created.updatedAt,
    };
  });
}

export async function listJobTargetHistory(
  userId: string,
  resumeId: string,
  limit = 10
): Promise<JobTargetHistoryItem[]> {
  return withUserRls(userId, async (tx) => {
    const rows = await tx
      .select({
        id: jobTargets.id,
        resumeId: jobTargets.resumeId,
        jobTitle: jobTargets.jobTitle,
        company: jobTargets.company,
        lastScore: jobTargets.lastScore,
        matchedKeywords: jobTargets.matchedKeywords,
        missingKeywords: jobTargets.missingKeywords,
        suggestions: jobTargets.suggestions,
        algorithmVersion: jobTargets.algorithmVersion,
        updatedAt: jobTargets.updatedAt,
      })
      .from(jobTargets)
      .where(eq(jobTargets.resumeId, resumeId))
      .orderBy(desc(jobTargets.updatedAt), desc(jobTargets.id))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      resumeId: row.resumeId,
      jobTitle: row.jobTitle,
      company: row.company,
      lastScore: row.lastScore === null ? null : Number(row.lastScore),
      matchedKeywords: Array.isArray(row.matchedKeywords) ? row.matchedKeywords : [],
      missingKeywords: Array.isArray(row.missingKeywords) ? row.missingKeywords : [],
      suggestions: Array.isArray(row.suggestions) ? row.suggestions : [],
      algorithmVersion: row.algorithmVersion,
      updatedAt: row.updatedAt,
    }));
  });
}

export async function trimJobTargetHistory(
  userId: string,
  resumeId: string,
  keep = 20
) {
  return withUserRls(userId, async (tx) => {
    if (keep < 1) {
      return;
    }

    const rows = await tx
      .select({
        id: jobTargets.id,
      })
      .from(jobTargets)
      .where(eq(jobTargets.resumeId, resumeId))
      .orderBy(desc(jobTargets.updatedAt), desc(jobTargets.id));

    const rowsToDelete = rows.slice(keep);
    if (rowsToDelete.length === 0) {
      return;
    }

    await tx
      .delete(jobTargets)
      .where(
        inArray(
          jobTargets.id,
          rowsToDelete.map((row) => row.id)
        )
      );
  });
}
