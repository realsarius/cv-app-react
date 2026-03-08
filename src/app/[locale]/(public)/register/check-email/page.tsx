import Link from 'next/link';
import { verifyEmailCodeAction } from './actions';

type CheckEmailPageProps = {
  searchParams?: {
    email?: string;
    error?: string;
  };
};

export default function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const email = searchParams?.email ?? '';

  return (
    <section>
      <h1 className='text-2xl font-bold tracking-tight text-stone-900'>
        E-postanı doğrula
      </h1>
      <p className='mt-2 text-sm text-stone-700'>
        Kayıt tamamlandı. Hesabını aktifleştirmek için e-postana gelen
        doğrulama bağlantısına tıkla.
      </p>
      <p className='mt-2 text-sm text-stone-700'>
        Bağlantı açılmazsa maildeki kodu aşağıdan girerek devam edebilirsin.
      </p>

      {searchParams?.error ? (
        <p className='message-error mt-4'>
          {searchParams.error}
        </p>
      ) : null}

      <form action={verifyEmailCodeAction} className='mt-6 space-y-4'>
        <label className='block'>
          <span className='form-label'>E-posta</span>
          <input
            type='email'
            name='email'
            required
            defaultValue={email}
            className='form-input'
            placeholder='ornek@mail.com'
          />
        </label>

        <label className='block'>
          <span className='form-label'>Doğrulama kodu</span>
          <input
            type='text'
            name='code'
            required
            inputMode='numeric'
            maxLength={12}
            pattern='[0-9]{6,12}'
            className='form-input'
            placeholder='94843772'
          />
          <span className='mt-1 block text-xs text-stone-600'>
            Maildeki kodu aynen gir. Kod uzunluğu projeye göre 6-12 haneli
            olabilir.
          </span>
        </label>

        <button type='submit' className='btn-primary w-full'>
          Kodu doğrula
        </button>
      </form>

      <p className='mt-5 text-sm text-stone-700'>
        Dilersen önce{' '}
        <Link href='/login' className='font-semibold text-stone-900 underline'>
          giriş ekranına
        </Link>{' '}
        dönebilirsin.
      </p>
    </section>
  );
}
