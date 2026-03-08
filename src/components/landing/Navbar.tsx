'use client';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type NavbarProps = {
  isLoggedIn: boolean;
};

const sectionAnchors = [
  { id: 'features', href: '/#features', key: 'features' },
  { id: 'templates', href: '/#templates', key: 'templates' },
  { id: 'pricing', href: '/#pricing', key: 'pricing' },
] as const;

export default function Navbar({ isLoggedIn }: NavbarProps) {
  const t = useTranslations('landing.nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 6);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const nextLocale = locale === 'tr' ? 'en' : 'tr';

  const handleLocaleSwitch = () => {
    router.replace(pathname, { locale: nextLocale });
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-150 ${
        isScrolled
          ? 'border-stone-300/90 bg-white/90 backdrop-blur'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className='app-container flex h-16 items-center justify-between gap-4'>
        <div className='flex items-center gap-8'>
          <Link
            href='/'
            className='text-base font-bold tracking-tight text-stone-900 sm:text-lg'
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {t('brand')}
          </Link>

          <nav className='hidden items-center gap-1 md:flex'>
            {sectionAnchors.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className='rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900'
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className='hidden items-center gap-2 md:flex'>
          <button
            type='button'
            onClick={handleLocaleSwitch}
            className='btn-secondary'
            aria-label={t('localeSwitch', { locale: nextLocale.toUpperCase() })}
          >
            {nextLocale.toUpperCase()}
          </button>

          {isLoggedIn ? (
            <Link href='/dashboard' className='btn-primary'>
              {t('dashboard')}
            </Link>
          ) : (
            <>
              <Link href='/login' className='btn-secondary'>
                {t('login')}
              </Link>
              <Link href='/register' className='btn-primary'>
                {t('cta')}
              </Link>
            </>
          )}
        </div>

        <button
          type='button'
          className='inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-800 md:hidden'
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? t('menuClose') : t('menuOpen')}
        >
          <span className='sr-only'>
            {isMobileMenuOpen ? t('menuClose') : t('menuOpen')}
          </span>
          {isMobileMenuOpen ? (
            <span className='text-lg leading-none'>x</span>
          ) : (
            <span className='text-lg leading-none'>=</span>
          )}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div className='border-t border-stone-300 bg-white md:hidden'>
          <div className='app-container space-y-3 py-4'>
            <nav className='flex flex-col gap-1'>
              {sectionAnchors.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className='rounded-md px-2 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100'
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            <div className='flex flex-col gap-2'>
              <button
                type='button'
                onClick={handleLocaleSwitch}
                className='btn-secondary w-full'
                aria-label={t('localeSwitch', { locale: nextLocale.toUpperCase() })}
              >
                {nextLocale.toUpperCase()}
              </button>

              {isLoggedIn ? (
                <Link
                  href='/dashboard'
                  className='btn-primary text-center'
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('dashboard')}
                </Link>
              ) : (
                <>
                  <Link
                    href='/login'
                    className='btn-secondary text-center'
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href='/register'
                    className='btn-primary text-center'
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('cta')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
