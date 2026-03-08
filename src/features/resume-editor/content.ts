import { z } from 'zod';

export const personalDetailsSchema = z.object({
  fullName: z.string().max(120),
  jobTitle: z.string().max(120),
  email: z.string().max(160),
  phone: z.string().max(64),
  address: z.string().max(200),
});

export const resumeContentSchema = z.object({
  personalDetails: personalDetailsSchema,
  profile: z.string().max(5000),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

const EMPTY_RESUME_CONTENT: ResumeContent = {
  personalDetails: {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    address: '',
  },
  profile: '',
};

export function createEmptyResumeContent(): ResumeContent {
  return {
    personalDetails: {
      ...EMPTY_RESUME_CONTENT.personalDetails,
    },
    profile: EMPTY_RESUME_CONTENT.profile,
  };
}

export function parseResumeContent(content: unknown): ResumeContent {
  const parsed = resumeContentSchema.safeParse(content);

  if (!parsed.success) {
    return createEmptyResumeContent();
  }

  return parsed.data;
}
