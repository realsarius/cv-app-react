import { useTranslations } from 'next-intl';

const featureKeys = [
  'ats',
  'autosave',
  'pdf',
  'templates',
  'share',
  'ai',
] as const;

const featureTokens: Record<(typeof featureKeys)[number], string> = {
  ats: 'ATS',
  autosave: 'SAVE',
  pdf: 'PDF',
  templates: 'TPL',
  share: 'LINK',
  ai: 'AI',
};

export default function FeaturesSection() {
  const t = useTranslations('landing.features');

  return (
    <section id='features' className='app-container scroll-mt-24 space-y-6'>
      <div className='space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
          {t('title')}
        </h2>
        <p className='max-w-2xl text-stone-700'>{t('subtitle')}</p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {featureKeys.map((key) => (
          <article key={key} className='app-card-muted space-y-3 p-5'>
            <span className='inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-stone-300 bg-white px-2 text-[11px] font-semibold tracking-wide text-stone-700'>
              {featureTokens[key]}
            </span>
            <h3 className='text-base font-semibold text-stone-900'>
              {t(`items.${key}.title`)}
            </h3>
            <p className='text-sm text-stone-700'>{t(`items.${key}.description`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
