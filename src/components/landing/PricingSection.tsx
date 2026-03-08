'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const freeFeatureKeys = [
  'resumeLimit',
  'templateLimit',
  'pdfLimit',
  'ats',
  'publicLink',
] as const;

const proFeatureKeys = [
  'resumeUnlimited',
  'templatesAll',
  'pdfUnlimited',
  'aiSuggestions',
  'coverLetter',
  'qr',
  'prioritySupport',
] as const;

export default function PricingSection() {
  const t = useTranslations('landing.pricing');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const isYearly = billingCycle === 'yearly';
  const proPrice = isYearly ? t('pro.priceYearly') : t('pro.priceMonthly');

  return (
    <section id='pricing' className='app-container scroll-mt-24 space-y-6'>
      <div className='space-y-2'>
        <h2 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
          {t('title')}
        </h2>
        <p className='max-w-2xl text-stone-700'>{t('subtitle')}</p>
      </div>

      <div className='inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white p-1'>
        <button
          type='button'
          onClick={() => setBillingCycle('monthly')}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            !isYearly ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          {t('monthly')}
        </button>
        <button
          type='button'
          onClick={() => setBillingCycle('yearly')}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            isYearly ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          {t('yearly')}
        </button>
        {isYearly ? (
          <span className='rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700'>
            {t('discount')}
          </span>
        ) : null}
      </div>

      <div className='mx-auto grid max-w-4xl gap-4 md:grid-cols-2'>
        <article className='app-card space-y-4 p-5'>
          <div>
            <p className='text-sm font-semibold text-stone-700'>{t('free.name')}</p>
            <p className='mt-1 text-3xl font-extrabold tracking-tight text-stone-900'>
              {t('free.price')}
              <span className='ml-1 text-sm font-medium text-stone-600'>{t('free.period')}</span>
            </p>
          </div>

          <ul className='space-y-2 text-sm text-stone-700'>
            {freeFeatureKeys.map((key) => (
              <li key={key} className='flex items-start gap-2'>
                <span className='mt-0.5 text-stone-900'>+</span>
                <span>{t(`free.features.${key}`)}</span>
              </li>
            ))}
          </ul>

          <Link href='/register' className='btn-secondary inline-flex'>
            {t('free.cta')}
          </Link>
        </article>

        <article className='app-card space-y-4 border-stone-900 p-5'>
          <div>
            <p className='text-sm font-semibold text-stone-900'>{t('pro.name')}</p>
            <p className='mt-1 text-3xl font-extrabold tracking-tight text-stone-900'>
              {proPrice}
              <span className='ml-1 text-sm font-medium text-stone-600'>{t('pro.period')}</span>
            </p>
            <p className='mt-1 text-xs text-stone-600'>{t('pro.comingNote')}</p>
          </div>

          <ul className='space-y-2 text-sm text-stone-700'>
            {proFeatureKeys.map((key) => (
              <li key={key} className='flex items-start gap-2'>
                <span className='mt-0.5 text-stone-900'>+</span>
                <span>{t(`pro.features.${key}`)}</span>
              </li>
            ))}
          </ul>

          <Link href='/register?plan=pro' className='btn-primary inline-flex'>
            {t('pro.cta')}
          </Link>
        </article>
      </div>
    </section>
  );
}
