import {
  RESUME_TEMPLATE_KEYS,
  type ResumeTemplateDefinition,
  type ResumeTemplateKey,
} from './types';

export const RESUME_TEMPLATES: readonly ResumeTemplateDefinition[] = [
  {
    id: 'ats-classic',
    labelKey: 'templateClassic',
    plan: 'free',
  },
  {
    id: 'ats-compact',
    labelKey: 'templateCompact',
    plan: 'free',
  },
  {
    id: 'atlantic-blue',
    labelKey: 'templateAtlanticBlue',
    plan: 'free',
  },
  {
    id: 'two-column',
    labelKey: 'templateTwoColumn',
    plan: 'pro',
  },
] as const;

const templateKeySet = new Set<string>(RESUME_TEMPLATE_KEYS);

export function isResumeTemplateKey(value: string): value is ResumeTemplateKey {
  return templateKeySet.has(value);
}

export function normalizeResumeTemplateKey(value: string | null | undefined): ResumeTemplateKey {
  if (!value) {
    return 'ats-classic';
  }

  return isResumeTemplateKey(value) ? value : 'ats-classic';
}
