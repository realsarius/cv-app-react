import { z } from 'zod';

const shortText = (max: number) => z.string().trim().max(max).default('');
const LANGUAGE_PROFICIENCY_LEVELS = [
  'native',
  'fluent',
  'advanced',
  'intermediate',
  'basic',
] as const;
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

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

export const skillItemSchema = z.object({
  id: shortText(64),
  name: shortText(120),
  level: z.enum(SKILL_LEVELS).default('intermediate'),
});

export const languageItemSchema = z.object({
  id: shortText(64),
  name: shortText(120),
  proficiency: z.enum(LANGUAGE_PROFICIENCY_LEVELS).default('intermediate'),
});

export const certificateItemSchema = z.object({
  id: shortText(64),
  name: shortText(160),
  issuer: shortText(120),
  date: shortText(20),
  url: shortText(240),
  credentialId: shortText(120),
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
  skills: z.array(skillItemSchema).max(40).default([]),
  languages: z.array(languageItemSchema).max(20).default([]),
  certificates: z.array(certificateItemSchema).max(20).default([]),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

export type ResumeExperienceItem = z.infer<typeof experienceItemSchema>;
export type ResumeEducationItem = z.infer<typeof educationItemSchema>;
export type ResumeProjectItem = z.infer<typeof projectItemSchema>;
export type ResumeSkillItem = z.infer<typeof skillItemSchema>;
export type ResumeLanguageItem = z.infer<typeof languageItemSchema>;
export type ResumeCertificateItem = z.infer<typeof certificateItemSchema>;
export type ResumeLanguageProficiency = (typeof LANGUAGE_PROFICIENCY_LEVELS)[number];
export type ResumeSkillLevel = (typeof SKILL_LEVELS)[number];

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
  skills: [],
  languages: [],
  certificates: [],
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
    skills: [...EMPTY_RESUME_CONTENT.skills],
    languages: [...EMPTY_RESUME_CONTENT.languages],
    certificates: [...EMPTY_RESUME_CONTENT.certificates],
  };
}

export function parseResumeContent(content: unknown): ResumeContent {
  const parsed = resumeContentSchema.safeParse(content);

  if (!parsed.success) {
    return createEmptyResumeContent();
  }

  return parsed.data;
}
