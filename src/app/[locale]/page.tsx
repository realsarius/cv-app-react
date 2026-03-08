import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import FeaturesSection from '@/components/landing/FeaturesSection';
import Footer from '@/components/landing/Footer';
import HeroSection from '@/components/landing/HeroSection';
import Navbar from '@/components/landing/Navbar';
import PricingSection from '@/components/landing/PricingSection';
import TemplatesSection from '@/components/landing/TemplatesSection';
import { routing } from '@/i18n/routing';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type AppLocale = (typeof routing.locales)[number];

type HomePageProps = {
  params: {
    locale: string;
  };
};

function resolveLocale(locale: string): AppLocale {
  return routing.locales.includes(locale as AppLocale)
    ? (locale as AppLocale)
    : routing.defaultLocale;
}

export async function generateMetadata({
  params: { locale },
}: HomePageProps): Promise<Metadata> {
  const resolvedLocale = resolveLocale(locale);
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: 'landing.meta',
  });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      type: 'website',
      locale: resolvedLocale === 'tr' ? 'tr_TR' : 'en_US',
      url: process.env.NEXT_PUBLIC_APP_URL,
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function HomePage() {
  let isLoggedIn = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      isLoggedIn = Boolean(user);
    } catch {
      isLoggedIn = false;
    }
  }

  return (
    <div className='min-h-screen'>
      <Navbar isLoggedIn={isLoggedIn} />
      <main className='space-y-16 pb-16 sm:space-y-20 sm:pb-20'>
        <HeroSection isLoggedIn={isLoggedIn} />
        <FeaturesSection />
        <TemplatesSection />
        <PricingSection />
      </main>
      <Footer isLoggedIn={isLoggedIn} />
    </div>
  );
}
