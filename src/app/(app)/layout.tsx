import Link from 'next/link';
import { signOutAction } from './actions';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className='min-h-screen'>
      <header className='border-b border-slate-200 bg-white/90 backdrop-blur'>
        <div className='mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-5'>
            <Link href='/dashboard' className='text-lg font-bold text-slate-900'>
              Resume Builder
            </Link>
            <nav className='flex items-center gap-2'>
              <Link
                href='/dashboard'
                className='rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100'
              >
                Dashboard
              </Link>
              <Link
                href='/settings'
                className='rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100'
              >
                Profil
              </Link>
            </nav>
          </div>

          <form action={signOutAction}>
            <button
              type='submit'
              className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500'
            >
              Cikis yap
            </button>
          </form>
        </div>
      </header>

      <main className='mx-auto w-full max-w-5xl p-6'>{children}</main>
    </div>
  );
}
