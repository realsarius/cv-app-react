import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=Supabase+ortam+degiskenleri+eksik');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <section className='space-y-4'>
      <h1 className='text-3xl font-bold text-slate-900'>Dashboard</h1>
      <p className='text-slate-700'>
        Hos geldin <span className='font-semibold'>{user.email}</span>
      </p>

      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-slate-900'>Ilk adimlar</h2>
        <ul className='mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700'>
          <li>CV veri modeli migration dosyalari olusturulacak.</li>
          <li>Editor sayfasi ve autosave akisi eklenecek.</li>
          <li>RLS ile kullanici bazli veri izolasyonu uygulanacak.</li>
        </ul>
      </div>
    </section>
  );
}
