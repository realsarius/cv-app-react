import type {
  ResumeAwardItem,
  ResumeCertificateItem,
  ResumeContent,
  ResumeCustomSection,
  ResumeCourseItem,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeInterestItem,
  ResumeLanguageItem,
  ResumeOrganisationItem,
  ResumePublicationItem,
  ResumeProjectItem,
  ResumeReferenceItem,
  ResumeSkillItem,
  ResumeContentSectionOrderKey,
} from '@/features/resume-editor/content';
import { resolveSectionOrder } from '@/features/resume-editor/section-order';
import type { ResumeTemplateKey } from '@/templates/resume/types';

type PreviewVisualSettings = {
  templateKey: ResumeTemplateKey;
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

function estimateSkillCost(item: ResumeSkillItem) {
  const heading = `${item.name} ${item.level}`.trim();
  return 2.8 + estimateLineCount(heading, 70) * 1;
}

function estimateLanguageCost(item: ResumeLanguageItem) {
  const heading = `${item.name} ${item.proficiency}`.trim();
  return 2.8 + estimateLineCount(heading, 70) * 1;
}

function estimateCertificateCost(item: ResumeCertificateItem) {
  const heading = `${item.name} ${item.issuer}`.trim();
  const meta = `${item.date} ${item.credentialId}`.trim();
  return (
    3.3 +
    estimateLineCount(heading, 64) * 1.05 +
    estimateLineCount(meta, 68) * 0.9 +
    estimateLineCount(item.url, 78) * 0.8
  );
}

function estimateAwardCost(item: ResumeAwardItem) {
  const heading = `${item.title} ${item.issuer}`.trim();
  return (
    3.4 +
    estimateLineCount(heading, 62) * 1.05 +
    estimateLineCount(item.date, 30) * 0.8 +
    estimateLineCount(item.description, 86) * 1.15
  );
}

function estimateInterestCost(item: ResumeInterestItem) {
  return 2.6 + estimateLineCount(item.name, 72) * 0.95;
}

function estimateCourseCost(item: ResumeCourseItem) {
  const heading = `${item.name} ${item.institution}`.trim();
  const meta = `${item.date} ${item.url}`.trim();
  return (
    3.2 +
    estimateLineCount(heading, 66) * 1.05 +
    estimateLineCount(meta, 78) * 0.9
  );
}

function estimateReferenceCost(item: ResumeReferenceItem) {
  const heading = `${item.name} ${item.title}`.trim();
  const meta = `${item.company} ${item.relationship} ${item.email} ${item.phone}`.trim();
  return (
    3.4 +
    estimateLineCount(heading, 66) * 1.05 +
    estimateLineCount(meta, 78) * 1
  );
}

function estimateOrganisationCost(item: ResumeOrganisationItem) {
  const heading = `${item.name} ${item.role}`.trim();
  const range = `${item.startDate} ${item.endDate}`.trim();
  return (
    3.6 +
    estimateLineCount(heading, 64) * 1.05 +
    estimateLineCount(range, 34) * 0.8 +
    estimateLineCount(item.description, 86) * 1.1
  );
}

function estimatePublicationCost(item: ResumePublicationItem) {
  const heading = `${item.title} ${item.publisher}`.trim();
  return (
    3.6 +
    estimateLineCount(heading, 62) * 1.05 +
    estimateLineCount(item.date, 30) * 0.8 +
    estimateLineCount(item.url, 74) * 0.9 +
    estimateLineCount(item.description, 84) * 1.1
  );
}

function estimateCustomSectionCost(section: ResumeCustomSection) {
  const sectionTitleCost = 2.4 + estimateLineCount(section.title, 60) * 1;
  const itemsCost = section.items.reduce((sum, item) => {
    return (
      sum +
      2.8 +
      estimateLineCount(item.heading, 64) * 1 +
      estimateLineCount(item.subheading, 64) * 0.9 +
      estimateLineCount(item.date, 30) * 0.8 +
      estimateLineCount(item.description, 86) * 1.05
    );
  }, 0);

  return sectionTitleCost + itemsCost;
}

function hasContent(page: ResumeContent) {
  return Boolean(
    page.profile ||
      page.experiences.length > 0 ||
      page.educations.length > 0 ||
      page.projects.length > 0 ||
      page.skills.length > 0 ||
      page.languages.length > 0 ||
      page.certificates.length > 0 ||
      page.awards.length > 0 ||
      page.interests.length > 0 ||
      page.courses.length > 0 ||
      page.references.length > 0 ||
      page.organisations.length > 0 ||
      page.publications.length > 0 ||
      page.customSections.length > 0
  );
}

function createPageSkeleton(
  personalDetails: ResumeContent['personalDetails'],
  sectionOrder: ResumeContent['sectionOrder']
) {
  return {
    personalDetails,
    profile: '',
    experiences: [],
    educations: [],
    projects: [],
    skills: [],
    languages: [],
    certificates: [],
    awards: [],
    interests: [],
    courses: [],
    references: [],
    organisations: [],
    publications: [],
    customSections: [],
    sectionOrder: [...sectionOrder],
  } satisfies ResumeContent;
}

function createPageCapacity(settings: PreviewVisualSettings) {
  const templateBonus =
    settings.templateKey === 'ats-compact'
      ? 6
      : settings.templateKey === 'two-column'
        ? -7
        : settings.templateKey === 'atlantic-blue'
          ? -2
          : 0;
  const density = (settings.fontScale + settings.spacingScale) / 2;
  const base = 72 + templateBonus;
  return Math.max(34, Math.floor(base / density));
}

type PaginatedListSectionKey = Exclude<ResumeContentSectionOrderKey, 'profile'>;

function addProfileSection(
  pages: ResumeContent[],
  remainingRef: { value: number },
  capacity: number,
  profile: string
) {
  const normalizedProfile = profile.trim();
  if (!normalizedProfile) {
    return;
  }

  const profileCost = estimateProfileCost(normalizedProfile);
  const current = pages[pages.length - 1]!;

  if (profileCost > remainingRef.value && hasContent(current)) {
    pages.push(createPageSkeleton(current.personalDetails, current.sectionOrder));
    remainingRef.value = capacity;
  }

  const nextCurrent = pages[pages.length - 1]!;
  nextCurrent.profile = normalizedProfile;
  remainingRef.value = Math.max(0, remainingRef.value - profileCost);
}

function addSectionItems<TItem>(
  pages: ResumeContent[],
  remainingRef: { value: number },
  capacity: number,
  section: PaginatedListSectionKey,
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
      pages.push(createPageSkeleton(current.personalDetails, current.sectionOrder));
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
  const pages: ResumeContent[] = [
    createPageSkeleton(content.personalDetails, content.sectionOrder),
  ];
  const remaining = { value: capacity };

  const orderedSections = resolveSectionOrder(content.sectionOrder);

  orderedSections.forEach((sectionKey) => {
    if (sectionKey === 'profile') {
      addProfileSection(pages, remaining, capacity, content.profile);
      return;
    }

    if (sectionKey === 'experiences') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.experiences,
        estimateExperienceCost
      );
      return;
    }

    if (sectionKey === 'educations') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.educations,
        estimateEducationCost
      );
      return;
    }

    if (sectionKey === 'projects') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.projects,
        estimateProjectCost
      );
      return;
    }

    if (sectionKey === 'skills') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.skills,
        estimateSkillCost
      );
      return;
    }

    if (sectionKey === 'languages') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.languages,
        estimateLanguageCost
      );
      return;
    }

    if (sectionKey === 'certificates') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.certificates,
        estimateCertificateCost
      );
      return;
    }

    if (sectionKey === 'awards') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.awards,
        estimateAwardCost
      );
      return;
    }

    if (sectionKey === 'interests') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.interests,
        estimateInterestCost
      );
      return;
    }

    if (sectionKey === 'courses') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.courses,
        estimateCourseCost
      );
      return;
    }

    if (sectionKey === 'references') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.references,
        estimateReferenceCost
      );
      return;
    }

    if (sectionKey === 'organisations') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.organisations,
        estimateOrganisationCost
      );
      return;
    }

    if (sectionKey === 'publications') {
      addSectionItems(
        pages,
        remaining,
        capacity,
        sectionKey,
        content.publications,
        estimatePublicationCost
      );
      return;
    }

    addSectionItems(
      pages,
      remaining,
      capacity,
      sectionKey,
      content.customSections,
      estimateCustomSectionCost
    );
  });

  if (pages.length === 1 && !hasContent(pages[0]!)) {
    return [content];
  }

  return pages;
}
