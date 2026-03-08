import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

type AppLocale = (typeof routing.locales)[number];

type PrivacyPageProps = {
  params: {
    locale: string;
  };
};

const sectionKeys = ['dataCollect', 'dataUse', 'dataStorage', 'contact'] as const;

function resolveLocale(locale: string): AppLocale {
  return routing.locales.includes(locale as AppLocale)
    ? (locale as AppLocale)
    : routing.defaultLocale;
}

export async function generateMetadata({
  params: { locale },
}: PrivacyPageProps): Promise<Metadata> {
  const resolvedLocale = resolveLocale(locale);
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: 'legal.privacy.meta',
  });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations('legal.privacy');

  return (
    <main className='app-container max-w-3xl py-14 sm:py-20'>
      <h1 className='text-3xl font-bold tracking-tight text-stone-900'>{t('title')}</h1>
      <p className='mt-2 text-sm text-stone-600'>{t('lastUpdated')}</p>

      <section className='mt-8 space-y-8'>
        {sectionKeys.map((key) => (
          <article key={key} className='space-y-2'>
            <h2 className='text-xl font-semibold text-stone-900'>{t(`sections.${key}.title`)}</h2>
            <p className='text-sm leading-7 text-stone-700'>{t(`sections.${key}.body`)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
