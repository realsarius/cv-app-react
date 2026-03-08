import Footer from '@/components/landing/Footer';
import Navbar from '@/components/landing/Navbar';
import { Link } from '@/i18n/navigation';
import { getIsLoggedIn } from '@/lib/supabase/auth-status';
import { getTranslations } from 'next-intl/server';

type LegalPageKey = 'privacy' | 'terms' | 'faq';

type LegalPageFrameProps = {
  activePage: LegalPageKey;
  title: string;
  lead: string;
  lastUpdated: string;
  children: React.ReactNode;
};

const legalPages = [
  { key: 'privacy', href: '/privacy' },
  { key: 'terms', href: '/terms' },
  { key: 'faq', href: '/faq' },
] as const;

export default async function LegalPageFrame({
  activePage,
  title,
  lead,
  lastUpdated,
  children,
}: LegalPageFrameProps) {
  const [isLoggedIn, t] = await Promise.all([
    getIsLoggedIn(),
    getTranslations('legal.common'),
  ]);

  return (
    <div className='min-h-screen bg-stone-50'>
      <Navbar isLoggedIn={isLoggedIn} />

      <main className='app-container max-w-5xl py-10 sm:py-14'>
        <div className='space-y-8'>
          <header className='rounded-xl border border-stone-200 bg-white p-6 sm:p-8'>
            <p className='text-xs font-semibold uppercase tracking-wide text-stone-500'>
              {t('legalCenter')}
            </p>
            <h1 className='mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>{title}</h1>
            <p className='mt-3 max-w-3xl text-sm leading-7 text-stone-700 sm:text-base'>{lead}</p>

            <div className='mt-6 flex flex-wrap items-center gap-2'>
              <span className='rounded-md bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 sm:text-sm'>
                {lastUpdated}
              </span>

              <Link href='/' className='rounded-md px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 sm:text-sm'>
                {t('backHome')}
              </Link>

              {isLoggedIn ? (
                <Link href='/dashboard' className='btn-secondary'>
                  {t('goDashboard')}
                </Link>
              ) : (
                <>
                  <Link href='/login' className='btn-secondary'>
                    {t('goLogin')}
                  </Link>
                  <Link href='/register' className='btn-primary'>
                    {t('goRegister')}
                  </Link>
                </>
              )}
            </div>
          </header>

          <nav className='rounded-xl border border-stone-200 bg-white p-4'>
            <p className='text-xs font-semibold uppercase tracking-wide text-stone-500'>{t('quickLinks')}</p>
            <div className='mt-3 flex flex-wrap gap-2'>
              {legalPages.map((page) => (
                <Link
                  key={page.key}
                  href={page.href}
                  className={
                    page.key === activePage
                      ? 'rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white'
                      : 'rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100'
                  }
                >
                  {t(`pages.${page.key}`)}
                </Link>
              ))}
            </div>
          </nav>

          <section className='rounded-xl border border-stone-200 bg-white p-6 sm:p-8'>{children}</section>

          <section className='rounded-xl border border-stone-200 bg-white p-6 sm:p-8'>
            <h2 className='text-lg font-semibold text-stone-900'>{t('help.title')}</h2>
            <p className='mt-2 text-sm leading-7 text-stone-700'>{t('help.body')}</p>
            <div className='mt-4 flex flex-wrap gap-2'>
              <Link href='/faq' className='btn-secondary'>
                {t('help.faq')}
              </Link>
              <a href='mailto:support@cvapp.com' className='btn-secondary'>
                {t('help.contact')}
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer isLoggedIn={isLoggedIn} />
    </div>
  );
}
