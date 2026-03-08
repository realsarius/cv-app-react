'use client';

import Link from 'next/link';

type ResumePrintActionsProps = {
  resumeId: string;
};

export default function ResumePrintActions({ resumeId }: ResumePrintActionsProps) {
  return (
    <div className='flex flex-wrap items-center gap-2 print:hidden'>
      <Link
        href={`/resumes/${resumeId}`}
        className='btn-secondary'
      >
        Editöre dön
      </Link>
      <Link
        href={`/api/resumes/${resumeId}/export`}
        target='_blank'
        className='btn-secondary'
      >
        PDF indir
      </Link>
      <button
        type='button'
        onClick={() => window.print()}
        className='btn-primary'
      >
        Yazdır / PDF al
      </button>
    </div>
  );
}
