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
        className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500'
      >
        Editore don
      </Link>
      <Link
        href={`/api/resumes/${resumeId}/export`}
        target='_blank'
        className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500'
      >
        PDF indir
      </Link>
      <button
        type='button'
        onClick={() => window.print()}
        className='rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700'
      >
        Yazdir / PDF al
      </button>
    </div>
  );
}
