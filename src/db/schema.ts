import { sql } from 'drizzle-orm';
import {
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
