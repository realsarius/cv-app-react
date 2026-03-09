import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const resumeStatusEnum = pgEnum('resume_status', [
  'draft',
  'published',
  'archived',
]);

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex('profiles_email_unique').on(table.email),
  })
);

export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull().default('Untitled Resume'),
    status: resumeStatusEnum('status').notNull().default('draft'),
    currentVersionNo: integer('current_version_no').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIndex: index('resumes_user_id_idx').on(table.userId),
    updatedAtIndex: index('resumes_updated_at_idx').on(table.updatedAt),
  })
);

export const resumeVersions = pgTable(
  'resume_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    versionNo: integer('version_no').notNull(),
    content: jsonb('content').notNull(),
    atsScore: numeric('ats_score', { precision: 5, scale: 2 }),
    algorithmVersion: text('algorithm_version'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    resumeIdIndex: index('resume_versions_resume_id_idx').on(table.resumeId),
    resumeVersionUnique: uniqueIndex(
      'resume_versions_resume_id_version_no_unique'
    ).on(table.resumeId, table.versionNo),
    contentSizeCheck: check(
      'resume_versions_content_size_check',
      sql`octet_length(${table.content}::text) <= 262144`
    ),
  })
);

export const jobTargets = pgTable(
  'job_targets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    jobTitle: text('job_title'),
    company: text('company'),
    jobDescription: text('job_description').notNull(),
    lastScore: numeric('last_score', { precision: 5, scale: 2 }),
    matchedKeywords: jsonb('matched_keywords').$type<string[]>(),
    missingKeywords: jsonb('missing_keywords').$type<string[]>(),
    suggestions: jsonb('suggestions').$type<string[]>(),
    algorithmVersion: text('algorithm_version'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    resumeIdIndex: index('job_targets_resume_id_idx').on(table.resumeId),
    updatedAtIndex: index('job_targets_updated_at_idx').on(table.updatedAt),
  })
);

export const resumeSettings = pgTable(
  'resume_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    templateKey: text('template_key').notNull().default('ats-classic'),
    fontScale: numeric('font_scale', { precision: 4, scale: 2 })
      .notNull()
      .default('1.00'),
    spacingScale: numeric('spacing_scale', { precision: 4, scale: 2 })
      .notNull()
      .default('1.00'),
    colorScheme: text('color_scheme').notNull().default('neutral'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    resumeIdUnique: uniqueIndex('resume_settings_resume_id_unique').on(
      table.resumeId
    ),
    updatedAtIndex: index('resume_settings_updated_at_idx').on(table.updatedAt),
  })
);

export const requestLogs = pgTable(
  'request_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    traceId: text('trace_id').notNull(),
    userId: uuid('user_id'),
    method: text('method').notNull(),
    path: text('path').notNull(),
    statusCode: integer('status_code'),
    durationMs: integer('duration_ms'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    locale: text('locale'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdAtIndex: index('request_logs_created_at_idx').on(table.createdAt),
    traceIdIndex: index('request_logs_trace_id_idx').on(table.traceId),
    userIdIndex: index('request_logs_user_id_idx').on(table.userId),
    pathIndex: index('request_logs_path_idx').on(table.path),
  })
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    traceId: text('trace_id').notNull(),
    userId: uuid('user_id').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: uuid('resource_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCreatedAtIndex: index('audit_logs_user_id_created_at_idx').on(
      table.userId,
      table.createdAt
    ),
    actionCreatedAtIndex: index('audit_logs_action_created_at_idx').on(
      table.action,
      table.createdAt
    ),
    traceIdIndex: index('audit_logs_trace_id_idx').on(table.traceId),
  })
);

export const authEvents = pgTable(
  'auth_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    traceId: text('trace_id').notNull(),
    userId: uuid('user_id'),
    emailHash: text('email_hash'),
    event: text('event').notNull(),
    provider: text('provider'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    success: boolean('success').notNull().default(true),
    failReason: text('fail_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCreatedAtIndex: index('auth_events_user_id_created_at_idx').on(
      table.userId,
      table.createdAt
    ),
    eventCreatedAtIndex: index('auth_events_event_created_at_idx').on(
      table.event,
      table.createdAt
    ),
    traceIdIndex: index('auth_events_trace_id_idx').on(table.traceId),
  })
);
