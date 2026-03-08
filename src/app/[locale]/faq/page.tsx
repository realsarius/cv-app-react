import type { Metadata } from 'next';
import LegalPageFrame from '@/components/legal/LegalPageFrame';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

type AppLocale = (typeof routing.locales)[number];

type FaqPageProps = {
  params: {
    locale: string;
  };
};

const faqKeys = [
  'free',
  'planLimits',
  'ats',
  'pdfExport',
  'templates',
  'share',
  'ai',
  'dataSecurity',
  'deleteData',
  'pro',
  'billing',
  'support',
] as const;

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
    <LegalPageFrame activePage='faq' title={t('title')} lead={t('lead')} lastUpdated={t('lastUpdated')}>
      <section className='space-y-6'>
        {faqKeys.map((key) => (
          <article key={key} className='rounded-lg border border-stone-200 bg-stone-50 p-5'>
            <h2 className='text-lg font-semibold text-stone-900'>{t(`items.${key}.question`)}</h2>
            <p className='mt-2 text-sm leading-7 text-stone-700'>{t(`items.${key}.answer`)}</p>
          </article>
        ))}
      </section>
    </LegalPageFrame>
  );
}
