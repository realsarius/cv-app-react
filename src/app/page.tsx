import Link from 'next/link';

export default function HomePage() {
  return (
    <main className='mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6'>
      <section className='w-full rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur'>
        <p className='text-sm font-semibold uppercase tracking-widest text-slate-500'>
          Resume Builder
        </p>
        <h1 className='mt-2 text-3xl font-bold text-slate-900'>
          Next.js modernizasyonu baslatildi
        </h1>
        <p className='mt-3 max-w-2xl text-slate-700'>
          Uygulama artik App Router yapisina geciyor. Ilk adim olarak kimlik
          dogrulama akisi ve korumali dashboard iskeleti eklendi.
        </p>

        <div className='mt-6 flex flex-wrap gap-3'>
          <Link
            href='/login'
            className='rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700'
          >
            Giris yap
          </Link>
          <Link
            href='/register'
            className='rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-500'
          >
            Kayit ol
          </Link>
        </div>
      </section>
    </main>
  );
}
