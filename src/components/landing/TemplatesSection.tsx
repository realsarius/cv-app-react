import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

const templateItems = [
  { key: 'classic', tier: 'free', popular: true },
  { key: 'modern', tier: 'pro', popular: false },
  { key: 'minimal', tier: 'pro', popular: false },
] as const;

function TemplateThumbnail() {
  return (
    <div className='aspect-[3/4] rounded-md border border-stone-200 bg-stone-50 p-3'>
      <div className='h-full w-full rounded border border-stone-300 bg-white p-2'>
        <div className='space-y-2'>
          <div className='h-2.5 w-20 rounded bg-stone-300' />
          <div className='h-2 w-28 rounded bg-stone-200' />
        </div>
        <div className='mt-4 space-y-1.5'>
          <div className='h-1.5 w-full rounded bg-stone-200' />
          <div className='h-1.5 w-full rounded bg-stone-200' />
          <div className='h-1.5 w-11/12 rounded bg-stone-200' />
        </div>
        <div className='mt-4 space-y-1.5'>
          <div className='h-1.5 w-2/5 rounded bg-stone-300' />
          <div className='h-1.5 w-full rounded bg-stone-200' />
          <div className='h-1.5 w-10/12 rounded bg-stone-200' />
        </div>
      </div>
    </div>
  );
}

export default function TemplatesSection() {
  const t = useTranslations('landing.templates');

  return (
    <section id='templates' className='app-container scroll-mt-24 space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div className='space-y-2'>
          <h2 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
            {t('title')}
          </h2>
          <p className='max-w-2xl text-stone-700'>{t('subtitle')}</p>
        </div>
        <Link href='/register' className='btn-secondary'>
          {t('viewAll')}
        </Link>
      </div>

      <div className='-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2'>
        {templateItems.map((item) => {
          const tierLabel = item.tier === 'free' ? t('free') : t('pro');
          return (
            <article
              key={item.key}
              className='app-card min-w-[260px] snap-start space-y-4 p-4 sm:min-w-[300px]'
            >
              <TemplateThumbnail />

              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <h3 className='text-base font-semibold text-stone-900'>
                    {t(`items.${item.key}.name`)}
                  </h3>
                  <span className='rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700'>
                    {tierLabel}
                  </span>
                </div>

                {item.popular ? (
                  <p className='text-xs font-medium text-stone-600'>{t('popular')}</p>
                ) : null}

                <p className='text-sm text-stone-700'>{t(`items.${item.key}.description`)}</p>

                {item.tier === 'pro' ? (
                  <p className='text-xs font-medium text-stone-600'>{t('locked')}</p>
                ) : null}
              </div>

              <Link href='/register' className='btn-secondary inline-flex'>
                {t('use')}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
