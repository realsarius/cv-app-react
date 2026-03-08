import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

type FooterProps = {
  isLoggedIn: boolean;
};

export default function Footer({ isLoggedIn }: FooterProps) {
  const t = useTranslations('landing.footer');
  const year = new Date().getFullYear();

  return (
    <footer className='border-t border-stone-300 bg-white py-10'>
      <div className='app-container grid gap-8 md:grid-cols-4'>
        <div className='space-y-2 md:col-span-1'>
          <p className='text-base font-semibold text-stone-900'>CV App</p>
          <p className='text-sm text-stone-700'>{t('description')}</p>
        </div>

        <div className='space-y-2'>
          <p className='text-sm font-semibold text-stone-900'>{t('product')}</p>
          <div className='flex flex-col gap-1 text-sm text-stone-700'>
            <Link href='/#features' className='hover:text-stone-900'>
              {t('features')}
            </Link>
            <Link href='/#templates' className='hover:text-stone-900'>
              {t('templates')}
            </Link>
            <Link href='/#pricing' className='hover:text-stone-900'>
              {t('pricing')}
            </Link>
          </div>
        </div>

        <div className='space-y-2'>
          <p className='text-sm font-semibold text-stone-900'>{t('resources')}</p>
          <div className='flex flex-col gap-1 text-sm text-stone-700'>
            {isLoggedIn ? (
              <Link href='/dashboard' className='hover:text-stone-900'>
                {t('dashboard')}
              </Link>
            ) : (
              <>
                <Link href='/login' className='hover:text-stone-900'>
                  {t('login')}
                </Link>
                <Link href='/register' className='hover:text-stone-900'>
                  {t('register')}
                </Link>
              </>
            )}
            <Link href='/faq' className='hover:text-stone-900'>
              {t('faq')}
            </Link>
          </div>
        </div>

        <div className='space-y-2'>
          <p className='text-sm font-semibold text-stone-900'>{t('legal')}</p>
          <div className='flex flex-col gap-1 text-sm text-stone-700'>
            <Link href='/privacy' className='hover:text-stone-900'>
              {t('privacy')}
            </Link>
            <Link href='/terms' className='hover:text-stone-900'>
              {t('terms')}
            </Link>
          </div>
        </div>
      </div>

      <div className='app-container mt-8 border-t border-stone-200 pt-4 text-xs text-stone-600'>
        © {year} CV App. {t('rights')}
      </div>
    </footer>
  );
}
