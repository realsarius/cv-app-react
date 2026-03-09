export const ADDABLE_SECTION_REGISTRY = [
  {
    key: 'profile',
    labelKey: 'addable.profile.label',
    descriptionKey: 'addable.profile.description',
  },
  {
    key: 'experiences',
    labelKey: 'addable.experiences.label',
    descriptionKey: 'addable.experiences.description',
  },
  {
    key: 'educations',
    labelKey: 'addable.educations.label',
    descriptionKey: 'addable.educations.description',
  },
  {
    key: 'projects',
    labelKey: 'addable.projects.label',
    descriptionKey: 'addable.projects.description',
  },
  {
    key: 'skills',
    labelKey: 'addable.skills.label',
    descriptionKey: 'addable.skills.description',
  },
  {
    key: 'languages',
    labelKey: 'addable.languages.label',
    descriptionKey: 'addable.languages.description',
  },
  {
    key: 'certificates',
    labelKey: 'addable.certificates.label',
    descriptionKey: 'addable.certificates.description',
  },
  {
    key: 'ats',
    labelKey: 'addable.ats.label',
    descriptionKey: 'addable.ats.description',
  },
] as const;

export type AddableSectionKey = (typeof ADDABLE_SECTION_REGISTRY)[number]['key'];
