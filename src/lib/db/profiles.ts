import { eq, sql } from 'drizzle-orm';
import { profiles } from '@/db/schema';
import { withUserRls } from './rls';

function normalizeEmail(userId: string, email: string | null | undefined) {
  const value = email?.trim().toLowerCase();
  if (value) {
    return value;
  }

  return `${userId}@local.invalid`;
}

export async function ensureUserProfile(userId: string, email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(userId, email);

  return withUserRls(userId, async (tx) => {
    await tx
      .insert(profiles)
      .values({
        id: userId,
        email: normalizedEmail,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          email: normalizedEmail,
          updatedAt: sql`now()`,
        },
      });

    const [profile] = await tx
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    return profile ?? null;
  });
}

export async function getOwnProfile(userId: string) {
  return withUserRls(userId, async (tx) => {
    const [profile] = await tx
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    return profile ?? null;
  });
}

export async function updateOwnProfile(userId: string, fullName: string) {
  return withUserRls(userId, async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({
        fullName: fullName.trim() || null,
        updatedAt: sql`now()`,
      })
      .where(eq(profiles.id, userId))
      .returning({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        updatedAt: profiles.updatedAt,
      });

    return profile ?? null;
  });
}
