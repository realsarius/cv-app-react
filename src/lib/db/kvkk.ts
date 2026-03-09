import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  auditLogs,
  authEvents,
  jobTargets,
  profiles,
  requestLogs,
  resumeSettings,
  resumeVersions,
  resumes,
} from '@/db/schema';
import { getDb } from './client';

export async function getUserDataExport(userId: string) {
  const db = getDb();

  const [profile, userResumes, userAuditLogs, userAuthEvents] = await Promise.all([
    db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1),
    db
      .select({
        id: resumes.id,
        title: resumes.title,
        status: resumes.status,
        currentVersionNo: resumes.currentVersionNo,
        createdAt: resumes.createdAt,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.updatedAt)),
    db
      .select({
        id: auditLogs.id,
        traceId: auditLogs.traceId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt)),
    db
      .select({
        id: authEvents.id,
        traceId: authEvents.traceId,
        event: authEvents.event,
        provider: authEvents.provider,
        success: authEvents.success,
        failReason: authEvents.failReason,
        createdAt: authEvents.createdAt,
      })
      .from(authEvents)
      .where(eq(authEvents.userId, userId))
      .orderBy(desc(authEvents.createdAt)),
  ]);

  const resumeIds = userResumes.map((resume) => resume.id);

  const [versions, settings, targets] =
    resumeIds.length > 0
      ? await Promise.all([
          db
            .select({
              id: resumeVersions.id,
              resumeId: resumeVersions.resumeId,
              versionNo: resumeVersions.versionNo,
              content: resumeVersions.content,
              atsScore: resumeVersions.atsScore,
              algorithmVersion: resumeVersions.algorithmVersion,
              createdAt: resumeVersions.createdAt,
            })
            .from(resumeVersions)
            .where(inArray(resumeVersions.resumeId, resumeIds))
            .orderBy(desc(resumeVersions.createdAt)),
          db
            .select({
              id: resumeSettings.id,
              resumeId: resumeSettings.resumeId,
              templateKey: resumeSettings.templateKey,
              fontScale: resumeSettings.fontScale,
              spacingScale: resumeSettings.spacingScale,
              colorScheme: resumeSettings.colorScheme,
              updatedAt: resumeSettings.updatedAt,
            })
            .from(resumeSettings)
            .where(inArray(resumeSettings.resumeId, resumeIds))
            .orderBy(desc(resumeSettings.updatedAt)),
          db
            .select({
              id: jobTargets.id,
              resumeId: jobTargets.resumeId,
              jobTitle: jobTargets.jobTitle,
              company: jobTargets.company,
              jobDescription: jobTargets.jobDescription,
              lastScore: jobTargets.lastScore,
              matchedKeywords: jobTargets.matchedKeywords,
              missingKeywords: jobTargets.missingKeywords,
              suggestions: jobTargets.suggestions,
              algorithmVersion: jobTargets.algorithmVersion,
              updatedAt: jobTargets.updatedAt,
            })
            .from(jobTargets)
            .where(inArray(jobTargets.resumeId, resumeIds))
            .orderBy(desc(jobTargets.updatedAt)),
        ])
      : [[], [], []];

  return {
    profile: profile[0] ?? null,
    resumes: userResumes,
    resumeVersions: versions,
    resumeSettings: settings,
    jobTargets: targets,
    auditLogs: userAuditLogs,
    authEvents: userAuthEvents,
  };
}

export async function deleteUserData(
  userId: string,
  options?: {
    deleteActivityLogs?: boolean;
  }
) {
  const db = getDb();
  const shouldDeleteActivityLogs = options?.deleteActivityLogs ?? false;

  return db.transaction(async (tx) => {
    const deletedRequestLogs = await tx
      .delete(requestLogs)
      .where(eq(requestLogs.userId, userId))
      .returning({ id: requestLogs.id });

    const deletedResumes = await tx
      .delete(resumes)
      .where(eq(resumes.userId, userId))
      .returning({ id: resumes.id });

    const deletedProfiles = await tx
      .delete(profiles)
      .where(eq(profiles.id, userId))
      .returning({ id: profiles.id });

    let deletedAuditLogs: { id: string }[] = [];
    let deletedAuthEvents: { id: string }[] = [];

    if (shouldDeleteActivityLogs) {
      deletedAuditLogs = await tx
        .delete(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .returning({ id: auditLogs.id });

      deletedAuthEvents = await tx
        .delete(authEvents)
        .where(eq(authEvents.userId, userId))
        .returning({ id: authEvents.id });
    }

    return {
      requestLogCount: deletedRequestLogs.length,
      resumeCount: deletedResumes.length,
      profileCount: deletedProfiles.length,
      auditLogCount: deletedAuditLogs.length,
      authEventCount: deletedAuthEvents.length,
      activityLogsDeleted: shouldDeleteActivityLogs,
    };
  });
}

export async function listRecentAuthEvents(userId: string, limit = 10) {
  const db = getDb();

  return db
    .select({
      id: authEvents.id,
      event: authEvents.event,
      provider: authEvents.provider,
      success: authEvents.success,
      failReason: authEvents.failReason,
      ip: authEvents.ip,
      createdAt: authEvents.createdAt,
    })
    .from(authEvents)
    .where(and(eq(authEvents.userId, userId), eq(authEvents.success, true)))
    .orderBy(desc(authEvents.createdAt))
    .limit(limit);
}

