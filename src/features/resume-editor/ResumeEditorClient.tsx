'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { messages } from '@/constants/messages';
import ResumePreviewDocument from './preview/ResumePreviewDocument';
import type {
  ResumeContent,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem,
} from './content';

type ResumeEditorClientProps = {
  resumeId: string;
  initialTitle: string;
  initialContent: ResumeContent;
  initialUpdatedAt: string;
  initialSettings: ResumeVisualSettings;
  initialAtsHistory: AtsHistoryItem[];
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AutosaveResponse = {
  ok: boolean;
  updatedAt: string;
  currentVersionNo: number;
};

type AutosaveErrorResponse = {
  error?: string;
  code?: string;
  currentUpdatedAt?: string;
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
  savedTarget?: AtsHistoryItem | null;
};

type AtsHistoryItem = {
  id: string;
  resumeId: string;
  jobTitle: string | null;
  company: string | null;
  lastScore: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  algorithmVersion: string | null;
  updatedAt: string;
};

type ResumeVisualSettings = {
  templateKey: 'ats-classic' | 'ats-compact';
  fontScale: number;
  spacingScale: number;
  colorScheme: 'neutral' | 'slate' | 'mono';
  updatedAt: string;
};

type ResumeSettingsResponse = {
  ok: boolean;
  settings: ResumeVisualSettings;
};

class AutosaveConflictError extends Error {
  readonly currentUpdatedAt: string | null;

  constructor(message: string, currentUpdatedAt: string | null) {
    super(message);
    this.name = 'AutosaveConflictError';
    this.currentUpdatedAt = currentUpdatedAt;
  }
}

function formatEditorDateTime(value: string, hydrated: boolean) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= 0) {
    return '-';
  }

  if (!hydrated) {
    return parsedDate.toISOString().slice(0, 19).replace('T', ' ');
  }

  return parsedDate.toLocaleString('tr-TR');
}

function createItemId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyExperienceItem(): ResumeExperienceItem {
  return {
    id: createItemId(),
    title: '',
    company: '',
    city: '',
    country: '',
    startDate: '',
    endDate: '',
    description: '',
  };
}

function createEmptyEducationItem(): ResumeEducationItem {
  return {
    id: createItemId(),
    school: '',
    degree: '',
    city: '',
    country: '',
    startDate: '',
    endDate: '',
    description: '',
  };
}

function createEmptyProjectItem(): ResumeProjectItem {
  return {
    id: createItemId(),
    title: '',
    subtitle: '',
    city: '',
    country: '',
    stack: '',
    description: '',
  };
}

export default function ResumeEditorClient({
  resumeId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
  initialSettings,
  initialAtsHistory,
}: ResumeEditorClientProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(initialUpdatedAt);
  const [isAutosaveBlocked, setIsAutosaveBlocked] = useState(false);
  const [settings, setSettings] = useState<ResumeVisualSettings>(initialSettings);
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<SaveStatus>('idle');
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  const [settingsLastSavedAt, setSettingsLastSavedAt] = useState(
    initialSettings.updatedAt
  );
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);
  const [atsResult, setAtsResult] = useState<AtsScoreResponse | null>(null);
  const [atsHistory, setAtsHistory] = useState<AtsHistoryItem[]>(initialAtsHistory);

  const saveSequenceRef = useRef(0);
  const isSaveInFlightRef = useRef(false);
  const lastServerUpdatedAtRef = useRef(initialUpdatedAt);
  const lastSavedPayloadRef = useRef(
    JSON.stringify({
      title: initialTitle,
      content: initialContent,
    })
  );
  const lastSavedSettingsRef = useRef(
    JSON.stringify({
      templateKey: initialSettings.templateKey,
      fontScale: initialSettings.fontScale,
      spacingScale: initialSettings.spacingScale,
      colorScheme: initialSettings.colorScheme,
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
  const settingsPayload = useMemo(
    () => ({
      templateKey: settings.templateKey,
      fontScale: settings.fontScale,
      spacingScale: settings.spacingScale,
      colorScheme: settings.colorScheme,
    }),
    [
      settings.colorScheme,
      settings.fontScale,
      settings.spacingScale,
      settings.templateKey,
    ]
  );
  const settingsPayloadString = useMemo(
    () => JSON.stringify(settingsPayload),
    [settingsPayload]
  );

  const savePayload = useCallback(
    async (nextPayloadString: string) => {
      const sequence = ++saveSequenceRef.current;
      setSaveStatus('saving');
      setSaveError(null);

      const requestPayload = JSON.stringify({
        ...(JSON.parse(nextPayloadString) as {
          title: string;
          content: ResumeContent;
        }),
        expectedUpdatedAt: lastServerUpdatedAtRef.current,
      });

      const response = await fetch(`/api/resumes/${resumeId}/autosave`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: requestPayload,
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | AutosaveErrorResponse
          | null;

        if (sequence !== saveSequenceRef.current) {
          return;
        }

        if (response.status === 409 && errorPayload?.code === 'write_conflict') {
          throw new AutosaveConflictError(
            errorPayload.error ||
              messages.resume.updatedInAnotherSession,
            errorPayload.currentUpdatedAt ?? null
          );
        }

        throw new Error(errorPayload?.error || messages.resume.autosaveFailed);
      }

      const responseData = (await response.json()) as AutosaveResponse;

      if (sequence !== saveSequenceRef.current) {
        return;
      }

      lastSavedPayloadRef.current = nextPayloadString;
      lastServerUpdatedAtRef.current = responseData.updatedAt;
      setLastSavedAt(responseData.updatedAt);
      setIsAutosaveBlocked(false);
      setSaveStatus('saved');
    },
    [resumeId]
  );

  const runSaveNow = useCallback(async () => {
    if (isAutosaveBlocked || isSaveInFlightRef.current) {
      return;
    }

    isSaveInFlightRef.current = true;

    try {
      await savePayload(payloadString);
    } catch (error) {
      setSaveStatus('error');
      if (error instanceof AutosaveConflictError) {
        if (error.currentUpdatedAt) {
          lastServerUpdatedAtRef.current = error.currentUpdatedAt;
          setLastSavedAt(error.currentUpdatedAt);
        }
        setIsAutosaveBlocked(true);
        setSaveError(error.message);
        return;
      }

      setSaveError(
        error instanceof Error ? error.message : messages.resume.autosaveFailed
      );
    } finally {
      isSaveInFlightRef.current = false;
    }
  }, [isAutosaveBlocked, payloadString, savePayload]);

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
          resumeId,
          jobTitle,
          company,
          jobDescription,
          content,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorPayload?.error || messages.ats.analysisFailed);
      }

      const scoreData = (await response.json()) as AtsScoreResponse;
      setAtsResult(scoreData);

      if (scoreData.savedTarget) {
        setAtsHistory((prev) =>
          [scoreData.savedTarget!, ...prev.filter((item) => item.id !== scoreData.savedTarget!.id)].slice(0, 8)
        );
      }
    } catch (error) {
      setAtsError(
        error instanceof Error ? error.message : messages.ats.analysisFailed
      );
    } finally {
      setAtsLoading(false);
    }
  }, [company, content, jobDescription, jobTitle, resumeId]);

  const runSettingsSave = useCallback(async () => {
    if (settingsPayloadString === lastSavedSettingsRef.current) {
      setSettingsSaveStatus('saved');
      return;
    }

    setSettingsSaveStatus('saving');
    setSettingsSaveError(null);

    try {
      const response = await fetch(`/api/resumes/${resumeId}/settings`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: settingsPayloadString,
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorPayload?.error || 'Ayarlar kaydedilemedi.');
      }

      const responseData = (await response.json()) as ResumeSettingsResponse;
      const persistedSettings = responseData.settings;

      lastSavedSettingsRef.current = JSON.stringify({
        templateKey: persistedSettings.templateKey,
        fontScale: persistedSettings.fontScale,
        spacingScale: persistedSettings.spacingScale,
        colorScheme: persistedSettings.colorScheme,
      });

      setSettings(persistedSettings);
      setSettingsLastSavedAt(persistedSettings.updatedAt);
      setSettingsSaveStatus('saved');
    } catch (error) {
      setSettingsSaveStatus('error');
      setSettingsSaveError(
        error instanceof Error ? error.message : 'Ayarlar kaydedilemedi.'
      );
    }
  }, [resumeId, settingsPayloadString]);

  const addExperience = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      experiences: [...prev.experiences, createEmptyExperienceItem()],
    }));
  }, []);

  const removeExperience = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((item) => item.id !== id),
    }));
  }, []);

  const addEducation = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      educations: [...prev.educations, createEmptyEducationItem()],
    }));
  }, []);

  const removeEducation = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      educations: prev.educations.filter((item) => item.id !== id),
    }));
  }, []);

  const addProject = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      projects: [...prev.projects, createEmptyProjectItem()],
    }));
  }, []);

  const removeProject = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      projects: prev.projects.filter((item) => item.id !== id),
    }));
  }, []);

  useEffect(() => {
    if (isAutosaveBlocked) {
      return;
    }

    if (payloadString === lastSavedPayloadRef.current) {
      if (saveStatus === 'saving') {
        setSaveStatus('saved');
      }
      return;
    }

    if (saveStatus === 'saving') {
      return;
    }

    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      void runSaveNow();
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isAutosaveBlocked, payloadString, runSaveNow, saveStatus]);

  const isDirty = payloadString !== lastSavedPayloadRef.current;
  const isSettingsDirty = settingsPayloadString !== lastSavedSettingsRef.current;
  const canRunAtsAnalysis = jobDescription.trim().length >= 50;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <section className='grid gap-6 lg:grid-cols-12'>
      <div className='space-y-6 lg:col-span-7'>
      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <h2 className='text-lg font-semibold text-stone-900'>Özgeçmiş başlığı</h2>
        <input
          type='text'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
          placeholder='Örnek: Frontend Developer CV'
        />
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>
            Özgeçmiş görünüm ayarları
          </h2>
          <button
            type='button'
            onClick={() => {
              void runSettingsSave();
            }}
            disabled={!isSettingsDirty || settingsSaveStatus === 'saving'}
            className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400'
          >
            {settingsSaveStatus === 'saving' ? 'Kaydediliyor' : 'Ayarları kaydet'}
          </button>
        </div>

        <p className='mt-2 text-sm text-stone-600'>
          Önizleme sayfasında kullanılacak şablon, renk ve boşluk ayarlarını yönet.
        </p>

        <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <label className='space-y-2 text-sm text-stone-700'>
            <span className='font-medium text-stone-900'>Şablon</span>
            <select
              value={settings.templateKey}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  templateKey:
                    event.target.value === 'ats-compact'
                      ? 'ats-compact'
                      : 'ats-classic',
                }))
              }
              className='w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
            >
              <option value='ats-classic'>ATS Classic</option>
              <option value='ats-compact'>ATS Compact</option>
            </select>
          </label>

          <label className='space-y-2 text-sm text-stone-700'>
            <span className='font-medium text-stone-900'>Renk düzeni</span>
            <select
              value={settings.colorScheme}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  colorScheme:
                    event.target.value === 'slate' || event.target.value === 'mono'
                      ? event.target.value
                      : 'neutral',
                }))
              }
              className='w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
            >
              <option value='neutral'>Neutral</option>
              <option value='slate'>Slate</option>
              <option value='mono'>Mono</option>
            </select>
          </label>

          <label className='space-y-2 text-sm text-stone-700 sm:col-span-2'>
            <span className='font-medium text-stone-900'>
              Font ölçeği ({settings.fontScale.toFixed(2)}x)
            </span>
            <input
              type='range'
              min='0.85'
              max='1.30'
              step='0.05'
              value={settings.fontScale}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  fontScale: Number.parseFloat(event.target.value),
                }))
              }
              className='w-full accent-stone-700'
            />
          </label>

          <label className='space-y-2 text-sm text-stone-700 sm:col-span-2'>
            <span className='font-medium text-stone-900'>
              Satır ve bölüm boşluğu ({settings.spacingScale.toFixed(2)}x)
            </span>
            <input
              type='range'
              min='0.80'
              max='1.40'
              step='0.05'
              value={settings.spacingScale}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  spacingScale: Number.parseFloat(event.target.value),
                }))
              }
              className='w-full accent-stone-700'
            />
          </label>
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-2 text-sm'>
          <span className='font-medium text-stone-900'>Durum:</span>
          <span className='rounded bg-stone-100 px-2 py-0.5 text-stone-700'>
            {settingsSaveStatus === 'saving' && 'Kaydediliyor'}
            {settingsSaveStatus === 'saved' && 'Kaydedildi'}
            {settingsSaveStatus === 'error' && 'Hata'}
            {settingsSaveStatus === 'idle' &&
              (isSettingsDirty ? 'Değişiklik var' : 'Hazır')}
          </span>
          <span className='text-stone-500'>
            Son kayıt: {formatEditorDateTime(settingsLastSavedAt, isHydrated)}
          </span>
        </div>

        {settingsSaveError ? (
          <p className='mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {settingsSaveError}
          </p>
        ) : null}
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <h2 className='text-lg font-semibold text-stone-900'>Kişisel bilgiler</h2>

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
            className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
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
            className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
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
            className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
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
            className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
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
            className='sm:col-span-2 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
            placeholder='Adres'
          />
        </div>
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <h2 className='text-lg font-semibold text-stone-900'>Profil özeti</h2>
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
          className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
          placeholder='Kısa kariyer özeti...'
        />
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>Deneyimler</h2>
          <button
            type='button'
            onClick={addExperience}
            className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
          >
            Deneyim ekle
          </button>
        </div>

        {content.experiences.length === 0 ? (
          <p className='mt-3 text-sm text-stone-500'>Henüz deneyim eklenmedi.</p>
        ) : (
          <div className='mt-4 space-y-4'>
            {content.experiences.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>Deneyim kaydı</p>
                  <button
                    type='button'
                    onClick={() => removeExperience(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    Sil
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.title}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        experiences: prev.experiences.map((exp) =>
                          exp.id === item.id ? { ...exp, title: event.target.value } : exp
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Pozisyon'
                  />
                  <input
                    type='text'
                    value={item.company}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        experiences: prev.experiences.map((exp) =>
                          exp.id === item.id
                            ? { ...exp, company: event.target.value }
                            : exp
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Şirket'
                  />
                  <input
                    type='text'
                    value={item.city}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        experiences: prev.experiences.map((exp) =>
                          exp.id === item.id ? { ...exp, city: event.target.value } : exp
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Şehir'
                  />
                  <input
                    type='text'
                    value={item.country}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        experiences: prev.experiences.map((exp) =>
                          exp.id === item.id
                            ? { ...exp, country: event.target.value }
                            : exp
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Ülke'
                  />
                  <input
                    type='text'
                    value={item.startDate}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        experiences: prev.experiences.map((exp) =>
                          exp.id === item.id
                            ? { ...exp, startDate: event.target.value }
                            : exp
                        ),
                      }))
                    }
                    maxLength={20}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Başlangıç'
                  />
                  <input
                    type='text'
                    value={item.endDate}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        experiences: prev.experiences.map((exp) =>
                          exp.id === item.id ? { ...exp, endDate: event.target.value } : exp
                        ),
                      }))
                    }
                    maxLength={20}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Bitiş'
                  />
                </div>
                <textarea
                  value={item.description}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      experiences: prev.experiences.map((exp) =>
                        exp.id === item.id
                          ? { ...exp, description: event.target.value }
                          : exp
                      ),
                    }))
                  }
                  rows={4}
                  maxLength={3000}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder='Sorumluluklar ve etkiler...'
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>Eğitim</h2>
          <button
            type='button'
            onClick={addEducation}
            className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
          >
            Eğitim ekle
          </button>
        </div>

        {content.educations.length === 0 ? (
          <p className='mt-3 text-sm text-stone-500'>Henüz eğitim eklenmedi.</p>
        ) : (
          <div className='mt-4 space-y-4'>
            {content.educations.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>Eğitim kaydı</p>
                  <button
                    type='button'
                    onClick={() => removeEducation(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    Sil
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.school}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        educations: prev.educations.map((edu) =>
                          edu.id === item.id
                            ? { ...edu, school: event.target.value }
                            : edu
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Okul'
                  />
                  <input
                    type='text'
                    value={item.degree}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        educations: prev.educations.map((edu) =>
                          edu.id === item.id
                            ? { ...edu, degree: event.target.value }
                            : edu
                        ),
                      }))
                    }
                    maxLength={160}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Bölüm / Derece'
                  />
                  <input
                    type='text'
                    value={item.city}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        educations: prev.educations.map((edu) =>
                          edu.id === item.id ? { ...edu, city: event.target.value } : edu
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Şehir'
                  />
                  <input
                    type='text'
                    value={item.country}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        educations: prev.educations.map((edu) =>
                          edu.id === item.id
                            ? { ...edu, country: event.target.value }
                            : edu
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Ülke'
                  />
                  <input
                    type='text'
                    value={item.startDate}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        educations: prev.educations.map((edu) =>
                          edu.id === item.id
                            ? { ...edu, startDate: event.target.value }
                            : edu
                        ),
                      }))
                    }
                    maxLength={20}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Başlangıç'
                  />
                  <input
                    type='text'
                    value={item.endDate}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        educations: prev.educations.map((edu) =>
                          edu.id === item.id ? { ...edu, endDate: event.target.value } : edu
                        ),
                      }))
                    }
                    maxLength={20}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Bitiş'
                  />
                </div>
                <textarea
                  value={item.description}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      educations: prev.educations.map((edu) =>
                        edu.id === item.id
                          ? { ...edu, description: event.target.value }
                          : edu
                      ),
                    }))
                  }
                  rows={3}
                  maxLength={3000}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder='Eğitim özet notu...'
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>Projeler</h2>
          <button
            type='button'
            onClick={addProject}
            className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
          >
            Proje ekle
          </button>
        </div>

        {content.projects.length === 0 ? (
          <p className='mt-3 text-sm text-stone-500'>Henüz proje eklenmedi.</p>
        ) : (
          <div className='mt-4 space-y-4'>
            {content.projects.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>Proje kaydı</p>
                  <button
                    type='button'
                    onClick={() => removeProject(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    Sil
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.title}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        projects: prev.projects.map((project) =>
                          project.id === item.id
                            ? { ...project, title: event.target.value }
                            : project
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Proje adı'
                  />
                  <input
                    type='text'
                    value={item.subtitle}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        projects: prev.projects.map((project) =>
                          project.id === item.id
                            ? { ...project, subtitle: event.target.value }
                            : project
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Alt başlık'
                  />
                  <input
                    type='text'
                    value={item.city}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        projects: prev.projects.map((project) =>
                          project.id === item.id
                            ? { ...project, city: event.target.value }
                            : project
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Şehir'
                  />
                  <input
                    type='text'
                    value={item.country}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        projects: prev.projects.map((project) =>
                          project.id === item.id
                            ? { ...project, country: event.target.value }
                            : project
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder='Ülke'
                  />
                </div>
                <input
                  type='text'
                  value={item.stack}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      projects: prev.projects.map((project) =>
                        project.id === item.id
                          ? { ...project, stack: event.target.value }
                          : project
                      ),
                    }))
                  }
                  maxLength={500}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder='Kullanılan teknolojiler (React, Next.js, PostgreSQL...)'
                />
                <textarea
                  value={item.description}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      projects: prev.projects.map((project) =>
                        project.id === item.id
                          ? { ...project, description: event.target.value }
                          : project
                      ),
                    }))
                  }
                  rows={4}
                  maxLength={3000}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder='Proje açıklaması...'
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>ATS analizi</h2>
          <button
            type='button'
            onClick={() => {
              void runAtsAnalysis();
            }}
            disabled={!canRunAtsAnalysis || atsLoading}
            className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400'
          >
            {atsLoading ? 'Analiz ediliyor' : 'ATS analiz et'}
          </button>
        </div>

        <p className='mt-2 text-sm text-stone-600'>
          İş ilanı metnini ekleyerek anahtar kelime kapsamı ve temel ATS sinyallerini
          hesapla.
        </p>

        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <input
            type='text'
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            maxLength={120}
            className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
            placeholder='İş unvanı (opsiyonel)'
          />
          <input
            type='text'
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            maxLength={120}
            className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
            placeholder='Şirket (opsiyonel)'
          />
        </div>

        <textarea
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          rows={8}
          className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
          placeholder='İş ilanını buraya yapıştır...'
        />

        {!canRunAtsAnalysis ? (
          <p className='mt-2 text-xs text-stone-500'>
            ATS analizi için en az 50 karakterlik iş ilanı metni gerekli.
          </p>
        ) : null}

        {atsError ? (
          <p className='mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {atsError}
          </p>
        ) : null}

        {atsResult ? (
          <div className='mt-4 space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4'>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='text-sm font-medium text-stone-700'>Toplam skor:</span>
              <span className='rounded bg-stone-900 px-2 py-0.5 text-sm font-semibold text-white'>
                {atsResult.overallScore}/100
              </span>
              <span className='text-xs text-stone-500'>
                Algoritma: {atsResult.algorithmVersion}
              </span>
            </div>

            <div className='grid grid-cols-1 gap-2 text-sm sm:grid-cols-2'>
              <p className='rounded bg-white px-2 py-1 text-stone-700'>
                Anahtar kelime kapsamı: {atsResult.breakdown.keywordCoverage}/50
              </p>
              <p className='rounded bg-white px-2 py-1 text-stone-700'>
                Bölüm bütünlüğü: {atsResult.breakdown.sectionCompleteness}/25
              </p>
              <p className='rounded bg-white px-2 py-1 text-stone-700'>
                Okunabilirlik: {atsResult.breakdown.readability}/15
              </p>
              <p className='rounded bg-white px-2 py-1 text-stone-700'>
                Pozisyon uyumu: {atsResult.breakdown.roleAlignment}/10
              </p>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div>
                <h3 className='text-sm font-semibold text-stone-800'>
                  Eşleşen anahtar kelimeler
                </h3>
                <p className='mt-1 text-sm text-stone-600'>
                  {atsResult.matchedKeywords.length > 0
                    ? atsResult.matchedKeywords.join(', ')
                    : 'Eşleşen kelime bulunamadı.'}
                </p>
              </div>
              <div>
                <h3 className='text-sm font-semibold text-stone-800'>
                  Eksik anahtar kelimeler
                </h3>
                <p className='mt-1 text-sm text-stone-600'>
                  {atsResult.missingKeywords.length > 0
                    ? atsResult.missingKeywords.join(', ')
                    : 'Eksik anahtar kelime bulunmadı.'}
                </p>
              </div>
            </div>

            {atsResult.suggestions.length > 0 ? (
              <div>
                <h3 className='text-sm font-semibold text-stone-800'>Öneriler</h3>
                <ul className='mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700'>
                  {atsResult.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className='mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4'>
          <h3 className='text-sm font-semibold text-stone-800'>ATS geçmişi</h3>
          {atsHistory.length === 0 ? (
            <p className='mt-2 text-sm text-stone-600'>
              Henüz kayıtlı ATS analizi bulunmuyor.
            </p>
          ) : (
            <ul className='mt-3 space-y-2'>
              {atsHistory.map((item) => (
                <li
                  key={item.id}
                  className='rounded border border-stone-200 bg-white px-3 py-2'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div>
                      <p className='text-sm font-semibold text-stone-900'>
                        {item.jobTitle || 'İş unvanı belirtilmedi'}
                      </p>
                      <p className='text-xs text-stone-500'>
                        {item.company || 'Şirket belirtilmedi'}
                      </p>
                    </div>
                    <span className='rounded bg-stone-900 px-2 py-0.5 text-xs font-semibold text-white'>
                      {item.lastScore ?? 0}/100
                    </span>
                  </div>
                  <p className='mt-1 text-xs text-stone-500'>
                    {formatEditorDateTime(item.updatedAt, isHydrated)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-sm text-stone-600'>
            Otomatik kaydetme 1.5 sn gecikme ile çalışır.
          </p>
          <button
            type='button'
            onClick={() => {
              void runSaveNow();
            }}
            disabled={isAutosaveBlocked || saveStatus === 'saving'}
            className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400'
          >
            Şimdi kaydet
          </button>
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-2 text-sm'>
          <span className='font-medium text-stone-900'>Durum:</span>
          <span className='rounded bg-stone-100 px-2 py-0.5 text-stone-700'>
            {saveStatus === 'saving' && 'Kaydediliyor'}
            {saveStatus === 'saved' && 'Kaydedildi'}
            {saveStatus === 'error' && 'Hata'}
            {saveStatus === 'idle' && (isDirty ? 'Değişiklik var' : 'Hazır')}
          </span>
          <span className='text-stone-500'>
            Son kayıt: {formatEditorDateTime(lastSavedAt, isHydrated)}
          </span>
        </div>

        {saveError ? (
          <p className='mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {saveError}
          </p>
        ) : null}

        {isAutosaveBlocked ? (
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='mt-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
          >
            Sayfayı yenile
          </button>
        ) : null}
      </div>
      </div>

      <aside className='h-fit lg:col-span-5 lg:sticky lg:top-6'>
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>Canlı önizleme</h2>
            <Link
              href={`/resumes/${resumeId}/preview`}
              className='rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-stone-500'
            >
              Ayrı sayfada aç
            </Link>
          </div>

          <div className='max-h-[72vh] overflow-auto rounded-md border border-stone-200 bg-stone-50 p-3'>
            <ResumePreviewDocument title={title} content={content} settings={settings} />
          </div>
        </div>
      </aside>
    </section>
  );
}
