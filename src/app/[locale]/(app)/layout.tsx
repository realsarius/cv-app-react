import Link from 'next/link';
import { signOutAction } from './actions';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className='app-shell'>
      <header className='app-header'>
        <div className='app-container flex h-16 items-center justify-between'>
          <div className='flex items-center gap-6'>
            <Link href='/dashboard' className='text-lg font-bold tracking-tight'>
              Özgeçmiş Oluşturucu
            </Link>
            <nav className='flex items-center gap-1'>
              <Link
                href='/dashboard'
                className='rounded-md px-2 py-1 text-sm font-medium text-stone-700 transition hover:bg-stone-100'
              >
                Panel
              </Link>
              <Link
                href='/settings'
                className='rounded-md px-2 py-1 text-sm font-medium text-stone-700 transition hover:bg-stone-100'
              >
                Profil
              </Link>
            </nav>
          </div>

          <form action={signOutAction}>
            <button type='submit' className='btn-secondary'>
              Çıkış yap
            </button>
          </form>
        </div>
      </header>

      <main className='app-container app-main'>{children}</main>
    </div>
  );
}
