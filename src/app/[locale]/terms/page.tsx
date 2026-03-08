import type { Metadata } from 'next';
import LegalPageFrame from '@/components/legal/LegalPageFrame';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

type AppLocale = (typeof routing.locales)[number];

type TermsPageProps = {
  params: {
    locale: string;
  };
};

const highlightKeys = ['clarity', 'safety', 'fairAccess'] as const;
const sectionKeys = [
  'acceptance',
  'eligibility',
  'serviceScope',
  'acceptableUse',
  'account',
  'payments',
  'intellectualProperty',
  'liability',
  'termination',
  'changes',
  'contact',
] as const;

function resolveLocale(locale: string): AppLocale {
  return routing.locales.includes(locale as AppLocale)
    ? (locale as AppLocale)
    : routing.defaultLocale;
}

export async function generateMetadata({
  params: { locale },
}: TermsPageProps): Promise<Metadata> {
  const resolvedLocale = resolveLocale(locale);
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: 'legal.terms.meta',
  });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function TermsPage() {
  const t = await getTranslations('legal.terms');

  return (
    <LegalPageFrame
      activePage='terms'
      title={t('title')}
      lead={t('lead')}
      lastUpdated={t('lastUpdated')}
    >
      <div className='space-y-8'>
        <div className='grid gap-3 sm:grid-cols-3'>
          {highlightKeys.map((key) => (
            <article key={key} className='rounded-lg border border-stone-200 bg-stone-50 p-4'>
              <h2 className='text-sm font-semibold text-stone-900'>{t(`highlights.${key}.title`)}</h2>
              <p className='mt-2 text-sm leading-6 text-stone-700'>{t(`highlights.${key}.body`)}</p>
            </article>
          ))}
        </div>

        <div className='space-y-7'>
          {sectionKeys.map((key) => (
            <article key={key} className='border-t border-stone-200 pt-6 first:border-t-0 first:pt-0'>
              <h2 className='text-xl font-semibold text-stone-900'>{t(`sections.${key}.title`)}</h2>
              <p className='mt-2 text-sm leading-7 text-stone-700'>{t(`sections.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </div>
    </LegalPageFrame>
  );
}
