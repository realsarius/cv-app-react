'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResumeContent } from './content';

type ResumeEditorClientProps = {
  resumeId: string;
  initialTitle: string;
  initialContent: ResumeContent;
  initialUpdatedAt: string;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AutosaveResponse = {
  ok: boolean;
  updatedAt: string;
  currentVersionNo: number;
};

type AtsScoreResponse = {
  overallScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  algorithmVersion: string;
  breakdown: {
    keywordCoverage: number;
    sectionCompleteness: number;
    readability: number;
    roleAlignment: number;
  };
};

export default function ResumeEditorClient({
  resumeId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
}: ResumeEditorClientProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(initialUpdatedAt);
  const [jobDescription, setJobDescription] = useState('');
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);
  const [atsResult, setAtsResult] = useState<AtsScoreResponse | null>(null);

  const saveSequenceRef = useRef(0);
  const lastSavedPayloadRef = useRef(
    JSON.stringify({
      title: initialTitle,
      content: initialContent,
    })
  );

  const payload = useMemo(
    () => ({
      title,
      content,
    }),
    [title, content]
  );

  const payloadString = useMemo(() => JSON.stringify(payload), [payload]);

  const savePayload = useCallback(
    async (nextPayloadString: string) => {
      const sequence = ++saveSequenceRef.current;
      setSaveStatus('saving');
      setSaveError(null);

      const response = await fetch(`/api/resumes/${resumeId}/autosave`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: nextPayloadString,
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorPayload?.error || 'Autosave basarisiz oldu.');
      }

      const responseData = (await response.json()) as AutosaveResponse;

      if (sequence !== saveSequenceRef.current) {
        return;
      }

      lastSavedPayloadRef.current = nextPayloadString;
      setLastSavedAt(responseData.updatedAt);
      setSaveStatus('saved');
    },
    [resumeId]
  );

  const runSaveNow = useCallback(async () => {
    try {
      await savePayload(payloadString);
    } catch (error) {
      setSaveStatus('error');
      setSaveError(
        error instanceof Error ? error.message : 'Autosave basarisiz oldu.'
      );
    }
  }, [payloadString, savePayload]);

  const runAtsAnalysis = useCallback(async () => {
    setAtsLoading(true);
    setAtsError(null);

    try {
      const response = await fetch('/api/ats/score', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription,
          content,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorPayload?.error || 'ATS analizi basarisiz oldu.');
      }

      const scoreData = (await response.json()) as AtsScoreResponse;
      setAtsResult(scoreData);
    } catch (error) {
      setAtsError(
        error instanceof Error ? error.message : 'ATS analizi basarisiz oldu.'
      );
    } finally {
      setAtsLoading(false);
    }
  }, [content, jobDescription]);

  useEffect(() => {
    if (payloadString === lastSavedPayloadRef.current) {
      if (saveStatus === 'saving') {
        setSaveStatus('saved');
      }
      return;
    }

    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      void runSaveNow();
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [payloadString, runSaveNow, saveStatus]);

  const isDirty = payloadString !== lastSavedPayloadRef.current;
  const canRunAtsAnalysis = jobDescription.trim().length >= 50;

  return (
    <section className='space-y-6'>
      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-slate-900'>Resume basligi</h2>
        <input
          type='text'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className='mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
          placeholder='Ornek: Frontend Developer CV'
        />
      </div>

      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-slate-900'>Kisisel bilgiler</h2>

        <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <input
            type='text'
            value={content.personalDetails.fullName}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                personalDetails: {
                  ...prev.personalDetails,
                  fullName: event.target.value,
                },
              }))
            }
            maxLength={120}
            className='rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
            placeholder='Ad soyad'
          />

          <input
            type='text'
            value={content.personalDetails.jobTitle}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                personalDetails: {
                  ...prev.personalDetails,
                  jobTitle: event.target.value,
                },
              }))
            }
            maxLength={120}
            className='rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
            placeholder='Pozisyon'
          />

          <input
            type='email'
            value={content.personalDetails.email}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                personalDetails: {
                  ...prev.personalDetails,
                  email: event.target.value,
                },
              }))
            }
            maxLength={160}
            className='rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
            placeholder='E-posta'
          />

          <input
            type='text'
            value={content.personalDetails.phone}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                personalDetails: {
                  ...prev.personalDetails,
                  phone: event.target.value,
                },
              }))
            }
            maxLength={64}
            className='rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
            placeholder='Telefon'
          />

          <input
            type='text'
            value={content.personalDetails.address}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                personalDetails: {
                  ...prev.personalDetails,
                  address: event.target.value,
                },
              }))
            }
            maxLength={200}
            className='sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
            placeholder='Adres'
          />
        </div>
      </div>

      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-slate-900'>Profil ozeti</h2>
        <textarea
          value={content.profile}
          onChange={(event) =>
            setContent((prev) => ({
              ...prev,
              profile: event.target.value,
            }))
          }
          maxLength={5000}
          rows={8}
          className='mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
          placeholder='Kisa kariyer ozeti...'
        />
      </div>

      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-slate-900'>ATS analizi</h2>
          <button
            type='button'
            onClick={() => {
              void runAtsAnalysis();
            }}
            disabled={!canRunAtsAnalysis || atsLoading}
            className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400'
          >
            {atsLoading ? 'Analiz ediliyor' : 'ATS analiz et'}
          </button>
        </div>

        <p className='mt-2 text-sm text-slate-600'>
          Is ilani metnini ekleyerek anahtar kelime kapsami ve temel ATS sinyallerini
          hesapla.
        </p>

        <textarea
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          rows={8}
          className='mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
          placeholder='Is ilanini buraya yapistir...'
        />

        {!canRunAtsAnalysis ? (
          <p className='mt-2 text-xs text-slate-500'>
            ATS analizi icin en az 50 karakterlik is ilani metni gerekli.
          </p>
        ) : null}

        {atsError ? (
          <p className='mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {atsError}
          </p>
        ) : null}

        {atsResult ? (
          <div className='mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4'>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='text-sm font-medium text-slate-700'>Toplam skor:</span>
              <span className='rounded bg-slate-900 px-2 py-0.5 text-sm font-semibold text-white'>
                {atsResult.overallScore}/100
              </span>
              <span className='text-xs text-slate-500'>
                Algoritma: {atsResult.algorithmVersion}
              </span>
            </div>

            <div className='grid grid-cols-1 gap-2 text-sm sm:grid-cols-2'>
              <p className='rounded bg-white px-2 py-1 text-slate-700'>
                Keyword coverage: {atsResult.breakdown.keywordCoverage}/50
              </p>
              <p className='rounded bg-white px-2 py-1 text-slate-700'>
                Section completeness: {atsResult.breakdown.sectionCompleteness}/25
              </p>
              <p className='rounded bg-white px-2 py-1 text-slate-700'>
                Readability: {atsResult.breakdown.readability}/15
              </p>
              <p className='rounded bg-white px-2 py-1 text-slate-700'>
                Role alignment: {atsResult.breakdown.roleAlignment}/10
              </p>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div>
                <h3 className='text-sm font-semibold text-slate-800'>
                  Eslesen anahtar kelimeler
                </h3>
                <p className='mt-1 text-sm text-slate-600'>
                  {atsResult.matchedKeywords.length > 0
                    ? atsResult.matchedKeywords.join(', ')
                    : 'Eslesen kelime bulunamadi.'}
                </p>
              </div>
              <div>
                <h3 className='text-sm font-semibold text-slate-800'>
                  Eksik anahtar kelimeler
                </h3>
                <p className='mt-1 text-sm text-slate-600'>
                  {atsResult.missingKeywords.length > 0
                    ? atsResult.missingKeywords.join(', ')
                    : 'Eksik anahtar kelime bulunmadi.'}
                </p>
              </div>
            </div>

            {atsResult.suggestions.length > 0 ? (
              <div>
                <h3 className='text-sm font-semibold text-slate-800'>Oneriler</h3>
                <ul className='mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700'>
                  {atsResult.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-sm text-slate-600'>
            Otomatik kaydetme 1.5 sn gecikme ile calisir.
          </p>
          <button
            type='button'
            onClick={() => {
              void runSaveNow();
            }}
            className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500'
          >
            Simdi kaydet
          </button>
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-2 text-sm'>
          <span className='font-medium text-slate-900'>Durum:</span>
          <span className='rounded bg-slate-100 px-2 py-0.5 text-slate-700'>
            {saveStatus === 'saving' && 'Kaydediliyor'}
            {saveStatus === 'saved' && 'Kaydedildi'}
            {saveStatus === 'error' && 'Hata'}
            {saveStatus === 'idle' && (isDirty ? 'Degisiklik var' : 'Hazir')}
          </span>
          <span className='text-slate-500'>
            Son kayit: {new Date(lastSavedAt).toLocaleString('tr-TR')}
          </span>
        </div>

        {saveError ? (
          <p className='mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {saveError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
