import { and, eq, inArray, sql } from 'drizzle-orm';
import { resumeSettings, resumes } from '@/db/schema';
import { withUserRls } from './rls';

export type ResumeVisualSettings = {
  templateKey: 'ats-classic' | 'ats-compact';
  fontScale: number;
  spacingScale: number;
  colorScheme: 'neutral' | 'slate' | 'mono';
  updatedAt: Date;
};

export const DEFAULT_RESUME_SETTINGS: ResumeVisualSettings = {
  templateKey: 'ats-classic',
  fontScale: 1,
  spacingScale: 1,
  colorScheme: 'neutral',
  updatedAt: new Date(0),
};

function normalizeTemplateKey(value: string | null | undefined): ResumeVisualSettings['templateKey'] {
  return value === 'ats-compact' ? 'ats-compact' : 'ats-classic';
}

function normalizeColorScheme(value: string | null | undefined): ResumeVisualSettings['colorScheme'] {
  if (value === 'slate' || value === 'mono') {
    return value;
  }

  return 'neutral';
}

function toNumber(value: string | number | null | undefined, fallback: number) {
  const nextValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return nextValue;
}

function toVisualSettings(
  row:
    | {
        templateKey: string;
        fontScale: string | number;
        spacingScale: string | number;
        colorScheme: string;
        updatedAt: Date;
      }
    | undefined
): ResumeVisualSettings {
  if (!row) {
    return {
      ...DEFAULT_RESUME_SETTINGS,
    };
  }

  return {
    templateKey: normalizeTemplateKey(row.templateKey),
    fontScale: toNumber(row.fontScale, 1),
    spacingScale: toNumber(row.spacingScale, 1),
    colorScheme: normalizeColorScheme(row.colorScheme),
    updatedAt: row.updatedAt,
  };
}

export async function getResumeSettings(userId: string, resumeId: string) {
  return withUserRls(userId, async (tx) => {
    const [resume] = await tx
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .limit(1);

    if (!resume) {
      return null;
    }

    const [settings] = await tx
      .select({
        templateKey: resumeSettings.templateKey,
        fontScale: resumeSettings.fontScale,
        spacingScale: resumeSettings.spacingScale,
        colorScheme: resumeSettings.colorScheme,
        updatedAt: resumeSettings.updatedAt,
      })
      .from(resumeSettings)
      .where(eq(resumeSettings.resumeId, resumeId))
      .limit(1);

    return toVisualSettings(settings);
  });
}

export type UpsertResumeSettingsInput = {
  templateKey: ResumeVisualSettings['templateKey'];
  fontScale: number;
  spacingScale: number;
  colorScheme: ResumeVisualSettings['colorScheme'];
};

export async function upsertResumeSettings(
  userId: string,
  resumeId: string,
  input: UpsertResumeSettingsInput
) {
  return withUserRls(userId, async (tx) => {
    const [resume] = await tx
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .limit(1);

    if (!resume) {
      return null;
    }

    await tx
      .insert(resumeSettings)
      .values({
        resumeId,
        templateKey: input.templateKey,
        fontScale: input.fontScale.toFixed(2),
        spacingScale: input.spacingScale.toFixed(2),
        colorScheme: input.colorScheme,
      })
      .onConflictDoUpdate({
        target: resumeSettings.resumeId,
        set: {
          templateKey: input.templateKey,
          fontScale: input.fontScale.toFixed(2),
          spacingScale: input.spacingScale.toFixed(2),
          colorScheme: input.colorScheme,
          updatedAt: sql`now()`,
        },
      });

    const [settings] = await tx
      .select({
        templateKey: resumeSettings.templateKey,
        fontScale: resumeSettings.fontScale,
        spacingScale: resumeSettings.spacingScale,
        colorScheme: resumeSettings.colorScheme,
        updatedAt: resumeSettings.updatedAt,
      })
      .from(resumeSettings)
      .where(eq(resumeSettings.resumeId, resumeId))
      .limit(1);

    return toVisualSettings(settings);
  });
}

export async function trimResumeSettingsOrphans(userId: string) {
  return withUserRls(userId, async (tx) => {
    const rows = await tx
      .select({
        id: resumeSettings.id,
        resumeId: resumeSettings.resumeId,
      })
      .from(resumeSettings);

    if (rows.length === 0) {
      return;
    }

    const resumesOwned = await tx
      .select({ id: resumes.id })
      .from(resumes)
      .where(eq(resumes.userId, userId));

    const ownedResumeIdSet = new Set(resumesOwned.map((row) => row.id));
    const orphanIds = rows
      .filter((row) => !ownedResumeIdSet.has(row.resumeId))
      .map((row) => row.id);

    if (orphanIds.length > 0) {
      await tx.delete(resumeSettings).where(inArray(resumeSettings.id, orphanIds));
    }
  });
}
