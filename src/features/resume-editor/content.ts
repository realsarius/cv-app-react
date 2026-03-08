import { z } from 'zod';

const shortText = (max: number) => z.string().trim().max(max).default('');

export const personalDetailsSchema = z.object({
  fullName: shortText(120),
  jobTitle: shortText(120),
  email: shortText(160),
  phone: shortText(64),
  address: shortText(200),
});

export const experienceItemSchema = z.object({
  id: shortText(64),
  title: shortText(120),
  company: shortText(120),
  city: shortText(120),
  country: shortText(120),
  startDate: shortText(20),
  endDate: shortText(20),
  description: shortText(3000),
});

export const educationItemSchema = z.object({
  id: shortText(64),
  school: shortText(120),
  degree: shortText(160),
  city: shortText(120),
  country: shortText(120),
  startDate: shortText(20),
  endDate: shortText(20),
  description: shortText(3000),
});

export const projectItemSchema = z.object({
  id: shortText(64),
  title: shortText(120),
  subtitle: shortText(120),
  city: shortText(120),
  country: shortText(120),
  stack: shortText(500),
  description: shortText(3000),
});

export const resumeContentSchema = z.object({
  personalDetails: personalDetailsSchema.default({
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    address: '',
  }),
  profile: shortText(5000),
  experiences: z.array(experienceItemSchema).max(20).default([]),
  educations: z.array(educationItemSchema).max(20).default([]),
  projects: z.array(projectItemSchema).max(20).default([]),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

export type ResumeExperienceItem = z.infer<typeof experienceItemSchema>;
export type ResumeEducationItem = z.infer<typeof educationItemSchema>;
export type ResumeProjectItem = z.infer<typeof projectItemSchema>;

const EMPTY_RESUME_CONTENT: ResumeContent = {
  personalDetails: {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    address: '',
  },
  profile: '',
  experiences: [],
  educations: [],
  projects: [],
};

export function createEmptyResumeContent(): ResumeContent {
  return {
    personalDetails: {
      ...EMPTY_RESUME_CONTENT.personalDetails,
    },
    profile: EMPTY_RESUME_CONTENT.profile,
    experiences: [...EMPTY_RESUME_CONTENT.experiences],
    educations: [...EMPTY_RESUME_CONTENT.educations],
    projects: [...EMPTY_RESUME_CONTENT.projects],
  };
}

export function parseResumeContent(content: unknown): ResumeContent {
  const parsed = resumeContentSchema.safeParse(content);

  if (!parsed.success) {
    return createEmptyResumeContent();
  }

  return parsed.data;
}
