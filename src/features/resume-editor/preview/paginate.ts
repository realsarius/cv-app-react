import type {
  ResumeContent,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem,
} from '@/features/resume-editor/content';

type PreviewVisualSettings = {
  templateKey: 'ats-classic' | 'ats-compact';
  fontScale: number;
  spacingScale: number;
  colorScheme: 'neutral' | 'slate' | 'mono';
};

export const PREVIEW_PAGE_BASE_WIDTH = 860;
export const PREVIEW_PAGE_ASPECT_RATIO = 297 / 210;
export const PREVIEW_PAGE_BASE_HEIGHT = Math.round(
  PREVIEW_PAGE_BASE_WIDTH * PREVIEW_PAGE_ASPECT_RATIO
);

function estimateLineCount(text: string, charsPerLine: number) {
  const cleaned = text.trim();
  if (!cleaned) {
    return 0;
  }

  return cleaned
    .split(/\n+/)
    .map((line) => Math.max(1, Math.ceil(line.trim().length / charsPerLine)))
    .reduce((sum, value) => sum + value, 0);
}

function estimateProfileCost(profile: string) {
  return 4 + estimateLineCount(profile, 95) * 1.2;
}

function estimateExperienceCost(item: ResumeExperienceItem) {
  const heading = `${item.title} ${item.company}`.trim();
  const location = `${item.city} ${item.country}`.trim();
  const date = `${item.startDate} ${item.endDate}`.trim();

  return (
    4.5 +
    estimateLineCount(heading, 62) * 1.1 +
    estimateLineCount(location, 68) * 0.9 +
    estimateLineCount(date, 26) * 0.7 +
    estimateLineCount(item.description, 86) * 1.25
  );
}

function estimateEducationCost(item: ResumeEducationItem) {
  const heading = `${item.school} ${item.degree}`.trim();
  const location = `${item.city} ${item.country}`.trim();
  const date = `${item.startDate} ${item.endDate}`.trim();

  return (
    4.2 +
    estimateLineCount(heading, 62) * 1.05 +
    estimateLineCount(location, 68) * 0.9 +
    estimateLineCount(date, 26) * 0.7 +
    estimateLineCount(item.description, 88) * 1.2
  );
}

function estimateProjectCost(item: ResumeProjectItem) {
  const heading = `${item.title} ${item.subtitle}`.trim();
  const location = `${item.city} ${item.country}`.trim();

  return (
    4.8 +
    estimateLineCount(heading, 62) * 1.1 +
    estimateLineCount(item.stack, 82) * 0.95 +
    estimateLineCount(location, 68) * 0.9 +
    estimateLineCount(item.description, 84) * 1.3
  );
}

function hasContent(page: ResumeContent) {
  return Boolean(
    page.profile ||
      page.experiences.length > 0 ||
      page.educations.length > 0 ||
      page.projects.length > 0
  );
}

function createPageSkeleton(personalDetails: ResumeContent['personalDetails']) {
  return {
    personalDetails,
    profile: '',
    experiences: [],
    educations: [],
    projects: [],
  } satisfies ResumeContent;
}

function createPageCapacity(settings: PreviewVisualSettings) {
  const compactBonus = settings.templateKey === 'ats-compact' ? 6 : 0;
  const density = (settings.fontScale + settings.spacingScale) / 2;
  const base = 72 + compactBonus;
  return Math.max(34, Math.floor(base / density));
}

function addSectionItems<TItem>(
  pages: ResumeContent[],
  remainingRef: { value: number },
  capacity: number,
  section: 'experiences' | 'educations' | 'projects',
  items: TItem[],
  estimateCost: (item: TItem) => number
) {
  const sectionHeaderCost = 3.4;

  for (const item of items) {
    const current = pages[pages.length - 1]!;
    const isFirstForSectionOnPage =
      (current[section] as unknown[]).length === 0;
    const itemCost = estimateCost(item);
    const required = itemCost + (isFirstForSectionOnPage ? sectionHeaderCost : 0);

    if (required > remainingRef.value && hasContent(current)) {
      pages.push(createPageSkeleton(current.personalDetails));
      remainingRef.value = capacity;
    }

    const nextCurrent = pages[pages.length - 1]!;
    const nextFirst = (nextCurrent[section] as unknown[]).length === 0;
    const nextRequired = itemCost + (nextFirst ? sectionHeaderCost : 0);

    (nextCurrent[section] as unknown[]).push(item as unknown);
    remainingRef.value = Math.max(0, remainingRef.value - nextRequired);
  }
}

export function paginateResumeContent(
  content: ResumeContent,
  settings: PreviewVisualSettings
) {
  const capacity = createPageCapacity(settings);
  const pages: ResumeContent[] = [createPageSkeleton(content.personalDetails)];
  const remaining = { value: capacity };

  if (content.profile.trim()) {
    const profileCost = estimateProfileCost(content.profile);
    pages[0]!.profile = content.profile;
    remaining.value = Math.max(0, remaining.value - profileCost);
  }

  addSectionItems(
    pages,
    remaining,
    capacity,
    'experiences',
    content.experiences,
    estimateExperienceCost
  );

  addSectionItems(
    pages,
    remaining,
    capacity,
    'educations',
    content.educations,
    estimateEducationCost
  );

  addSectionItems(
    pages,
    remaining,
    capacity,
    'projects',
    content.projects,
    estimateProjectCost
  );

  if (pages.length === 1 && !hasContent(pages[0]!)) {
    return [content];
  }

  return pages;
}

