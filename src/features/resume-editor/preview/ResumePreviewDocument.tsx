import type { ResumeContent } from '@/features/resume-editor/content';
import type { ResumeTemplateKey } from '@/templates/resume/types';
import { useTranslations } from 'next-intl';
import AtlanticBlueTemplate from './templates/AtlanticBlueTemplate';
import TwoColumnTemplate from './templates/TwoColumnTemplate';

type PreviewVisualSettings = {
  templateKey: ResumeTemplateKey;
  fontScale: number;
  spacingScale: number;
  colorScheme: 'neutral' | 'slate' | 'mono';
};

type ResumePreviewDocumentProps = {
  title: string;
  content: ResumeContent;
  settings: PreviewVisualSettings;
  printFriendly?: boolean;
  className?: string;
};

function formatRange(startDate: string, endDate: string, ongoingLabel: string) {
  const start = startDate.trim();
  const end = endDate.trim();

  if (start && end) {
    return `${start} - ${end}`;
  }

  if (start) {
    return `${start} - ${ongoingLabel}`;
  }

  if (end) {
    return end;
  }

  return '';
}

function buildPalette(colorScheme: PreviewVisualSettings['colorScheme']) {
  if (colorScheme === 'mono') {
    return {
      border: 'border-zinc-300',
      title: 'text-zinc-900',
      body: 'text-zinc-800',
      muted: 'text-zinc-600',
      sectionLabel: 'text-zinc-700',
      sectionDivider: 'border-zinc-200',
    };
  }

  if (colorScheme === 'slate') {
    return {
      border: 'border-slate-300',
      title: 'text-slate-950',
      body: 'text-slate-800',
      muted: 'text-slate-600',
      sectionLabel: 'text-slate-700',
      sectionDivider: 'border-slate-200',
    };
  }

  return {
    border: 'border-stone-300',
    title: 'text-stone-900',
    body: 'text-stone-800',
    muted: 'text-stone-600',
    sectionLabel: 'text-stone-700',
    sectionDivider: 'border-stone-200',
  };
}

export default function ResumePreviewDocument({
  title,
  content,
  settings,
  printFriendly = false,
  className,
}: ResumePreviewDocumentProps) {
  const t = useTranslations('resume.previewDocument');

  if (settings.templateKey === 'atlantic-blue') {
    return (
      <AtlanticBlueTemplate
        title={title}
        content={content}
        settings={settings}
        printFriendly={printFriendly}
        className={className}
      />
    );
  }

  if (settings.templateKey === 'two-column') {
    return (
      <TwoColumnTemplate
        title={title}
        content={content}
        settings={settings}
        printFriendly={printFriendly}
        className={className}
      />
    );
  }

  const isCompactTemplate = settings.templateKey === 'ats-compact';
  const palette = buildPalette(settings.colorScheme);
  const sectionSpacing = isCompactTemplate ? 'mt-4' : 'mt-6';
  const contentSpacing = isCompactTemplate ? 'space-y-3' : 'space-y-4';
  const articleLineHeight = Math.max(
    1.3,
    Math.min(2, Number((1.55 * settings.spacingScale).toFixed(2)))
  );
  const typography = isCompactTemplate
    ? {
        title: 2.2,
        subtitle: 1.06,
        section: 0.84,
        body: 0.92,
        meta: 0.78,
      }
    : {
        title: 2.5,
        subtitle: 1.1,
        section: 0.86,
        body: 0.95,
        meta: 0.8,
      };

  const articleClassName = [
    'w-full border bg-white shadow-sm',
    printFriendly
      ? 'mx-auto max-w-[210mm] rounded-lg print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none'
      : 'rounded-md',
    palette.border,
    isCompactTemplate ? 'p-5' : 'p-7',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      style={{
        fontSize: `${settings.fontScale}rem`,
        lineHeight: articleLineHeight,
      }}
      className={articleClassName}
    >
      <header className={`cv-header border-b pb-4 ${palette.border}`}>
        <h2
          className={`font-bold ${palette.title}`}
          style={{ fontSize: `${typography.title}em`, lineHeight: 1.1 }}
        >
          {content.personalDetails.fullName || title || t('fullNameFallback')}
        </h2>
        <p
          className={`mt-1 ${palette.body}`}
          style={{ fontSize: `${typography.subtitle}em`, lineHeight: articleLineHeight }}
        >
          {content.personalDetails.jobTitle || t('positionFallback')}
        </p>
        <p
          className={`mt-2 ${palette.muted}`}
          style={{ fontSize: `${typography.meta}em`, lineHeight: articleLineHeight }}
        >
          {[
            content.personalDetails.email,
            content.personalDetails.phone,
            content.personalDetails.address,
          ]
            .filter(Boolean)
            .join(' | ')}
        </p>
      </header>

      {content.profile ? (
        <section className={`${sectionSpacing} border-b pb-4 ${palette.sectionDivider}`}>
          <h3
            className={`font-semibold ${palette.sectionLabel}`}
            style={{ fontSize: `${typography.section}em` }}
          >
            {t('sections.profile')}
          </h3>
          <p
            className={`mt-2 whitespace-pre-wrap ${palette.body}`}
            style={{ fontSize: `${typography.body}em`, lineHeight: articleLineHeight }}
          >
            {content.profile}
          </p>
        </section>
      ) : null}

      {content.experiences.length > 0 ? (
        <section className={`${sectionSpacing} border-b pb-4 ${palette.sectionDivider}`}>
          <h3
            className={`font-semibold ${palette.sectionLabel}`}
            style={{ fontSize: `${typography.section}em` }}
          >
            {t('sections.experience')}
          </h3>
          <div className={`mt-3 ${contentSpacing}`}>
            {content.experiences.map((item) => (
              <div key={item.id} className='cv-experience-item'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p
                    className={`font-semibold ${palette.title}`}
                    style={{ fontSize: `${typography.body}em` }}
                  >
                    {item.title || t('positionFallback')}
                    {item.company ? ` - ${item.company}` : ''}
                  </p>
                  {formatRange(item.startDate, item.endDate, t('range.ongoing')) ? (
                    <p
                      className={palette.sectionLabel}
                      style={{ fontSize: `${typography.meta}em` }}
                    >
                      {formatRange(item.startDate, item.endDate, t('range.ongoing'))}
                    </p>
                  ) : null}
                </div>
                {item.city || item.country ? (
                  <p
                    className={palette.sectionLabel}
                    style={{ fontSize: `${typography.meta}em` }}
                  >
                    {[item.city, item.country].filter(Boolean).join(', ')}
                  </p>
                ) : null}
                {item.description ? (
                  <p
                    className={`mt-1 whitespace-pre-wrap ${palette.body}`}
                    style={{ fontSize: `${typography.body}em`, lineHeight: articleLineHeight }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {content.educations.length > 0 ? (
        <section className={`${sectionSpacing} border-b pb-4 ${palette.sectionDivider}`}>
          <h3
            className={`font-semibold ${palette.sectionLabel}`}
            style={{ fontSize: `${typography.section}em` }}
          >
            {t('sections.education')}
          </h3>
          <div className={`mt-3 ${contentSpacing}`}>
            {content.educations.map((item) => (
              <div key={item.id} className='cv-education-item'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p
                    className={`font-semibold ${palette.title}`}
                    style={{ fontSize: `${typography.body}em` }}
                  >
                    {item.school || t('schoolFallback')}
                    {item.degree ? ` - ${item.degree}` : ''}
                  </p>
                  {formatRange(item.startDate, item.endDate, t('range.ongoing')) ? (
                    <p
                      className={palette.sectionLabel}
                      style={{ fontSize: `${typography.meta}em` }}
                    >
                      {formatRange(item.startDate, item.endDate, t('range.ongoing'))}
                    </p>
                  ) : null}
                </div>
                {item.city || item.country ? (
                  <p
                    className={palette.sectionLabel}
                    style={{ fontSize: `${typography.meta}em` }}
                  >
                    {[item.city, item.country].filter(Boolean).join(', ')}
                  </p>
                ) : null}
                {item.description ? (
                  <p
                    className={`mt-1 whitespace-pre-wrap ${palette.body}`}
                    style={{ fontSize: `${typography.body}em`, lineHeight: articleLineHeight }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {content.projects.length > 0 ? (
        <section className={sectionSpacing}>
          <h3
            className={`font-semibold ${palette.sectionLabel}`}
            style={{ fontSize: `${typography.section}em` }}
          >
            {t('sections.projects')}
          </h3>
          <div className={`mt-3 ${contentSpacing}`}>
            {content.projects.map((item) => (
              <div key={item.id} className='cv-project-item'>
                <p
                  className={`font-semibold ${palette.title}`}
                  style={{ fontSize: `${typography.body}em` }}
                >
                  {item.title || t('projectFallback')}
                  {item.subtitle ? ` - ${item.subtitle}` : ''}
                </p>
                {item.stack ? (
                  <p
                    className={palette.sectionLabel}
                    style={{ fontSize: `${typography.meta}em` }}
                  >
                    {item.stack}
                  </p>
                ) : null}
                {item.city || item.country ? (
                  <p
                    className={palette.sectionLabel}
                    style={{ fontSize: `${typography.meta}em` }}
                  >
                    {[item.city, item.country].filter(Boolean).join(', ')}
                  </p>
                ) : null}
                {item.description ? (
                  <p
                    className={`mt-1 whitespace-pre-wrap ${palette.body}`}
                    style={{ fontSize: `${typography.body}em`, lineHeight: articleLineHeight }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
