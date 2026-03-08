import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

type AppLocale = (typeof routing.locales)[number];

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: {
    locale: string;
  };
};

function isValidLocale(locale: string): locale is AppLocale {
  return routing.locales.includes(locale as AppLocale);
}

export async function generateMetadata({
  params: { locale },
}: Pick<LocaleLayoutProps, 'params'>): Promise<Metadata> {
  if (!isValidLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
  if (!isValidLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
