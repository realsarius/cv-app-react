import type { ResumeContent } from '@/features/resume-editor/content';
import type { ResumeTemplateKey } from '@/templates/resume/types';
import { useTranslations } from 'next-intl';

type PreviewVisualSettings = {
  templateKey: ResumeTemplateKey;
  fontScale: number;
  spacingScale: number;
  colorScheme: 'neutral' | 'slate' | 'mono';
};

type TwoColumnTemplateProps = {
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

function getTheme(colorScheme: PreviewVisualSettings['colorScheme']) {
  if (colorScheme === 'mono') {
    return {
      border: 'border-zinc-300',
      asideBg: 'bg-zinc-100',
      asideBorder: 'border-zinc-300',
      heading: 'text-zinc-900',
      body: 'text-zinc-800',
      muted: 'text-zinc-600',
      sectionDivider: 'border-zinc-200',
    };
  }

  if (colorScheme === 'slate') {
    return {
      border: 'border-slate-300',
      asideBg: 'bg-slate-100',
      asideBorder: 'border-slate-300',
      heading: 'text-slate-900',
      body: 'text-slate-800',
      muted: 'text-slate-600',
      sectionDivider: 'border-slate-200',
    };
  }

  return {
    border: 'border-stone-300',
    asideBg: 'bg-stone-100',
    asideBorder: 'border-stone-300',
    heading: 'text-stone-900',
    body: 'text-stone-800',
    muted: 'text-stone-600',
    sectionDivider: 'border-stone-200',
  };
}

export default function TwoColumnTemplate({
  title,
  content,
  settings,
  printFriendly = false,
  className,
}: TwoColumnTemplateProps) {
  const t = useTranslations('resume.previewDocument');
  const theme = getTheme(settings.colorScheme);
  const lineHeight = Math.max(
    1.3,
    Math.min(2, Number((1.5 * settings.spacingScale).toFixed(2)))
  );
  const articleClassName = [
    'w-full overflow-hidden border bg-white shadow-sm',
    printFriendly
      ? 'mx-auto max-w-[210mm] rounded-lg print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none'
      : 'rounded-md',
    theme.border,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      style={{
        fontSize: `${settings.fontScale}rem`,
        lineHeight,
      }}
      className={articleClassName}
    >
      <div className='grid min-h-full grid-cols-1 md:grid-cols-[35%_65%]'>
        <aside className={`border-b p-5 md:border-b-0 md:border-r ${theme.asideBg} ${theme.asideBorder}`}>
          <h2 className={`text-[1.65em] font-bold leading-tight ${theme.heading}`}>
            {content.personalDetails.fullName || title || t('fullNameFallback')}
          </h2>
          <p className={`mt-1 text-[0.95em] ${theme.body}`}>
            {content.personalDetails.jobTitle || t('positionFallback')}
          </p>

          <div className={`mt-4 space-y-1 text-[0.8em] ${theme.muted}`}>
            {content.personalDetails.email ? <p>{content.personalDetails.email}</p> : null}
            {content.personalDetails.phone ? <p>{content.personalDetails.phone}</p> : null}
            {content.personalDetails.address ? <p>{content.personalDetails.address}</p> : null}
          </div>

          {content.profile ? (
            <section className={`mt-6 border-t pt-4 ${theme.sectionDivider}`}>
              <h3 className={`text-[0.82em] font-bold uppercase tracking-wide ${theme.heading}`}>
                {t('sections.profile')}
              </h3>
              <p className={`mt-2 whitespace-pre-wrap text-[0.88em] ${theme.body}`}>
                {content.profile}
              </p>
            </section>
          ) : null}
        </aside>

        <main className='space-y-5 p-6'>
          {content.experiences.length > 0 ? (
            <section className={`cv-section border-b pb-4 ${theme.sectionDivider}`}>
              <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.heading}`}>
                {t('sections.experience')}
              </h3>
              <div className='mt-3 space-y-4'>
                {content.experiences.map((item) => (
                  <div key={item.id} className='cv-experience-item'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className={`text-[0.94em] font-semibold ${theme.body}`}>
                        {item.title || t('positionFallback')}
                        {item.company ? ` - ${item.company}` : ''}
                      </p>
                      {formatRange(item.startDate, item.endDate, t('range.ongoing')) ? (
                        <p className={`text-[0.78em] ${theme.muted}`}>
                          {formatRange(item.startDate, item.endDate, t('range.ongoing'))}
                        </p>
                      ) : null}
                    </div>
                    {item.city || item.country ? (
                      <p className={`text-[0.78em] ${theme.muted}`}>
                        {[item.city, item.country].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                    {item.description ? (
                      <p className={`mt-1 whitespace-pre-wrap text-[0.9em] ${theme.body}`}>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {content.educations.length > 0 ? (
            <section className={`cv-section border-b pb-4 ${theme.sectionDivider}`}>
              <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.heading}`}>
                {t('sections.education')}
              </h3>
              <div className='mt-3 space-y-4'>
                {content.educations.map((item) => (
                  <div key={item.id} className='cv-education-item'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className={`text-[0.94em] font-semibold ${theme.body}`}>
                        {item.school || t('schoolFallback')}
                        {item.degree ? ` - ${item.degree}` : ''}
                      </p>
                      {formatRange(item.startDate, item.endDate, t('range.ongoing')) ? (
                        <p className={`text-[0.78em] ${theme.muted}`}>
                          {formatRange(item.startDate, item.endDate, t('range.ongoing'))}
                        </p>
                      ) : null}
                    </div>
                    {item.city || item.country ? (
                      <p className={`text-[0.78em] ${theme.muted}`}>
                        {[item.city, item.country].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                    {item.description ? (
                      <p className={`mt-1 whitespace-pre-wrap text-[0.9em] ${theme.body}`}>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {content.projects.length > 0 ? (
            <section className='cv-section'>
              <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.heading}`}>
                {t('sections.projects')}
              </h3>
              <div className='mt-3 space-y-4'>
                {content.projects.map((item) => (
                  <div key={item.id} className='cv-project-item'>
                    <p className={`text-[0.94em] font-semibold ${theme.body}`}>
                      {item.title || t('projectFallback')}
                      {item.subtitle ? ` - ${item.subtitle}` : ''}
                    </p>
                    {item.stack ? <p className={`text-[0.78em] ${theme.muted}`}>{item.stack}</p> : null}
                    {item.city || item.country ? (
                      <p className={`text-[0.78em] ${theme.muted}`}>
                        {[item.city, item.country].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                    {item.description ? (
                      <p className={`mt-1 whitespace-pre-wrap text-[0.9em] ${theme.body}`}>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </article>
  );
}
