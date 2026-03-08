export const RESUME_TEMPLATE_KEYS = [
  'ats-classic',
  'ats-compact',
  'atlantic-blue',
  'two-column',
] as const;

export type ResumeTemplateKey = (typeof RESUME_TEMPLATE_KEYS)[number];

export type ResumeTemplatePlan = 'free' | 'pro';

export type ResumeTemplateLabelKey =
  | 'templateClassic'
  | 'templateCompact'
  | 'templateAtlanticBlue'
  | 'templateTwoColumn';

export type ResumeTemplateDefinition = {
  id: ResumeTemplateKey;
  labelKey: ResumeTemplateLabelKey;
  plan: ResumeTemplatePlan;
};
