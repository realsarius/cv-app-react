import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

type AppLocale = (typeof routing.locales)[number];

type FaqPageProps = {
  params: {
    locale: string;
  };
};

const faqKeys = ['free', 'ats', 'share', 'pro'] as const;

function resolveLocale(locale: string): AppLocale {
  return routing.locales.includes(locale as AppLocale)
    ? (locale as AppLocale)
    : routing.defaultLocale;
}

export async function generateMetadata({
  params: { locale },
}: FaqPageProps): Promise<Metadata> {
  const resolvedLocale = resolveLocale(locale);
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: 'legal.faq.meta',
  });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function FaqPage() {
  const t = await getTranslations('legal.faq');

  return (
    <main className='app-container max-w-3xl py-14 sm:py-20'>
      <h1 className='text-3xl font-bold tracking-tight text-stone-900'>{t('title')}</h1>
      <p className='mt-2 text-sm text-stone-600'>{t('lastUpdated')}</p>

      <section className='mt-8 space-y-6'>
        {faqKeys.map((key) => (
          <article key={key} className='border-b border-stone-200 pb-5 last:border-b-0 last:pb-0'>
            <h2 className='text-lg font-semibold text-stone-900'>{t(`items.${key}.question`)}</h2>
            <p className='mt-2 text-sm leading-7 text-stone-700'>{t(`items.${key}.answer`)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
