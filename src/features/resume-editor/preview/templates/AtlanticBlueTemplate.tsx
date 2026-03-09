import type { ResumeContent } from '@/features/resume-editor/content';
import type { ResumeTemplateKey } from '@/templates/resume/types';
import { useTranslations } from 'next-intl';

type PreviewVisualSettings = {
  templateKey: ResumeTemplateKey;
  fontScale: number;
  spacingScale: number;
  colorScheme: 'neutral' | 'slate' | 'mono';
};

type AtlanticBlueTemplateProps = {
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
      headerBg: 'bg-zinc-900',
      headerMuted: 'text-zinc-300',
      border: 'border-zinc-300',
      sectionTitle: 'text-zinc-900',
      body: 'text-zinc-800',
      meta: 'text-zinc-600',
      sectionDivider: 'border-zinc-200',
    };
  }

  if (colorScheme === 'slate') {
    return {
      headerBg: 'bg-slate-900',
      headerMuted: 'text-slate-200',
      border: 'border-slate-300',
      sectionTitle: 'text-slate-900',
      body: 'text-slate-800',
      meta: 'text-slate-600',
      sectionDivider: 'border-slate-200',
    };
  }

  return {
    headerBg: 'bg-[#17324f]',
    headerMuted: 'text-blue-100',
    border: 'border-stone-300',
    sectionTitle: 'text-[#17324f]',
    body: 'text-stone-800',
    meta: 'text-stone-600',
    sectionDivider: 'border-stone-200',
  };
}

export default function AtlanticBlueTemplate({
  title,
  content,
  settings,
  printFriendly = false,
  className,
}: AtlanticBlueTemplateProps) {
  const t = useTranslations('resume.previewDocument');
  const theme = getTheme(settings.colorScheme);
  const lineHeight = Math.max(
    1.3,
    Math.min(2, Number((1.56 * settings.spacingScale).toFixed(2)))
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
      <header className={`cv-header ${theme.headerBg} p-6`}>
        <h2 className='text-[2.2em] font-bold leading-[1.05] text-white'>
          {content.personalDetails.fullName || title || t('fullNameFallback')}
        </h2>
        <p className='mt-1 text-[1.02em] text-white/90'>
          {content.personalDetails.jobTitle || t('positionFallback')}
        </p>
        <p className={`mt-3 text-[0.8em] ${theme.headerMuted}`}>
          {[content.personalDetails.email, content.personalDetails.phone, content.personalDetails.address]
            .filter(Boolean)
            .join(' | ')}
        </p>
      </header>

      <div className='space-y-5 p-6'>
        {content.profile ? (
          <section className={`border-b pb-4 ${theme.sectionDivider}`}>
            <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.sectionTitle}`}>
              {t('sections.profile')}
            </h3>
            <p className={`mt-2 whitespace-pre-wrap text-[0.95em] ${theme.body}`}>{content.profile}</p>
          </section>
        ) : null}

        {content.experiences.length > 0 ? (
          <section className={`border-b pb-4 ${theme.sectionDivider}`}>
            <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.sectionTitle}`}>
              {t('sections.experience')}
            </h3>
            <div className='mt-3 space-y-4'>
              {content.experiences.map((item) => (
                <div key={item.id} className='cv-experience-item'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className={`text-[0.95em] font-semibold ${theme.body}`}>
                      {item.title || t('positionFallback')}
                      {item.company ? ` - ${item.company}` : ''}
                    </p>
                    {formatRange(item.startDate, item.endDate, t('range.ongoing')) ? (
                      <p className={`text-[0.8em] ${theme.meta}`}>
                        {formatRange(item.startDate, item.endDate, t('range.ongoing'))}
                      </p>
                    ) : null}
                  </div>
                  {item.city || item.country ? (
                    <p className={`text-[0.8em] ${theme.meta}`}>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className={`mt-1 whitespace-pre-wrap text-[0.92em] ${theme.body}`}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.educations.length > 0 ? (
          <section className={`border-b pb-4 ${theme.sectionDivider}`}>
            <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.sectionTitle}`}>
              {t('sections.education')}
            </h3>
            <div className='mt-3 space-y-4'>
              {content.educations.map((item) => (
                <div key={item.id} className='cv-education-item'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className={`text-[0.95em] font-semibold ${theme.body}`}>
                      {item.school || t('schoolFallback')}
                      {item.degree ? ` - ${item.degree}` : ''}
                    </p>
                    {formatRange(item.startDate, item.endDate, t('range.ongoing')) ? (
                      <p className={`text-[0.8em] ${theme.meta}`}>
                        {formatRange(item.startDate, item.endDate, t('range.ongoing'))}
                      </p>
                    ) : null}
                  </div>
                  {item.city || item.country ? (
                    <p className={`text-[0.8em] ${theme.meta}`}>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className={`mt-1 whitespace-pre-wrap text-[0.92em] ${theme.body}`}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.projects.length > 0 ? (
          <section>
            <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.sectionTitle}`}>
              {t('sections.projects')}
            </h3>
            <div className='mt-3 space-y-4'>
              {content.projects.map((item) => (
                <div key={item.id} className='cv-project-item'>
                  <p className={`text-[0.95em] font-semibold ${theme.body}`}>
                    {item.title || t('projectFallback')}
                    {item.subtitle ? ` - ${item.subtitle}` : ''}
                  </p>
                  {item.stack ? <p className={`text-[0.8em] ${theme.meta}`}>{item.stack}</p> : null}
                  {item.city || item.country ? (
                    <p className={`text-[0.8em] ${theme.meta}`}>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className={`mt-1 whitespace-pre-wrap text-[0.92em] ${theme.body}`}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.skills.length > 0 ? (
          <section className={`border-t pt-4 ${theme.sectionDivider}`}>
            <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.sectionTitle}`}>
              {t('sections.skills')}
            </h3>
            <div className='mt-3 space-y-3'>
              {content.skills.map((item) => (
                <div key={item.id}>
                  <p className={`text-[0.95em] font-semibold ${theme.body}`}>{item.name}</p>
                  <p className={`text-[0.8em] ${theme.meta}`}>{t(`skillLevel.${item.level}`)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.languages.length > 0 ? (
          <section className={`border-t pt-4 ${theme.sectionDivider}`}>
            <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.sectionTitle}`}>
              {t('sections.languages')}
            </h3>
            <div className='mt-3 space-y-3'>
              {content.languages.map((item) => (
                <div key={item.id}>
                  <p className={`text-[0.95em] font-semibold ${theme.body}`}>{item.name}</p>
                  <p className={`text-[0.8em] ${theme.meta}`}>
                    {t(`languageLevel.${item.proficiency}`)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.certificates.length > 0 ? (
          <section className={`border-t pt-4 ${theme.sectionDivider}`}>
            <h3 className={`text-[0.86em] font-bold uppercase tracking-wide ${theme.sectionTitle}`}>
              {t('sections.certificates')}
            </h3>
            <div className='mt-3 space-y-3'>
              {content.certificates.map((item) => (
                <div key={item.id}>
                  <p className={`text-[0.95em] font-semibold ${theme.body}`}>{item.name}</p>
                  <p className={`text-[0.8em] ${theme.meta}`}>
                    {[item.issuer, item.date].filter(Boolean).join(' | ')}
                  </p>
                  {item.credentialId ? (
                    <p className={`text-[0.8em] ${theme.meta}`}>{item.credentialId}</p>
                  ) : null}
                  {item.url ? <p className={`text-[0.8em] ${theme.meta}`}>{item.url}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
