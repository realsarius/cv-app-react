import {
  RESUME_CONTENT_SECTION_ORDER_KEYS,
  type ResumeContent,
  type ResumeContentSectionOrderKey,
} from './content';

const SECTION_ORDER_SET = new Set<ResumeContentSectionOrderKey>(
  RESUME_CONTENT_SECTION_ORDER_KEYS
);

export function resolveSectionOrder(
  sectionOrder: ResumeContent['sectionOrder']
): ResumeContentSectionOrderKey[] {
  const preferred = sectionOrder.filter((key): key is ResumeContentSectionOrderKey =>
    SECTION_ORDER_SET.has(key)
  );
  const deduped = Array.from(new Set(preferred));

  for (const key of RESUME_CONTENT_SECTION_ORDER_KEYS) {
    if (!deduped.includes(key)) {
      deduped.push(key);
    }
  }

  return deduped;
}
