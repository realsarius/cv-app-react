'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

type ResumePrintActionsProps = {
  resumeId: string;
};

export default function ResumePrintActions({ resumeId }: ResumePrintActionsProps) {
  const t = useTranslations('resume.editor');

  return (
    <div className='flex flex-wrap items-center gap-2 print:hidden'>
      <Link
        href={`/resumes/${resumeId}`}
        className='btn-secondary'
      >
        {t('backToEditor')}
      </Link>
      <Link
        href={`/api/resumes/${resumeId}/export`}
        target='_blank'
        className='btn-secondary'
      >
        {t('downloadPdf')}
      </Link>
      <button
        type='button'
        onClick={() => window.print()}
        className='btn-primary'
      >
        {t('print')}
      </button>
    </div>
  );
}
