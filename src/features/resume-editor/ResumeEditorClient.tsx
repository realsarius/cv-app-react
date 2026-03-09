'use client';

import { Link } from '@/i18n/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  RESUME_TEMPLATES,
  normalizeResumeTemplateKey,
} from '@/templates/resume/registry';
import type { ResumeTemplateKey } from '@/templates/resume/types';
import PaginatedResumePreview from './preview/PaginatedResumePreview';
import {
  PREVIEW_PAGE_BASE_HEIGHT,
  PREVIEW_PAGE_BASE_WIDTH,
} from './preview/paginate';
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
  templateKey: ResumeTemplateKey;
  fontScale: number;
  spacingScale: number;
  colorScheme: 'neutral' | 'slate' | 'mono';
  updatedAt: string;
};

type ResumeSettingsResponse = {
  ok: boolean;
  settings: ResumeVisualSettings;
};

type AddableSection = {
  key: 'profile' | 'experiences' | 'educations' | 'projects' | 'ats';
  label: string;
  description: string;
  isAdded: boolean;
  onAdd: () => void;
};

class AutosaveConflictError extends Error {
  readonly currentUpdatedAt: string | null;

  constructor(message: string, currentUpdatedAt: string | null) {
    super(message);
    this.name = 'AutosaveConflictError';
    this.currentUpdatedAt = currentUpdatedAt;
  }
}

function formatEditorDateTime(value: string, hydrated: boolean, locale: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= 0) {
    return '-';
  }

  if (!hydrated) {
    return parsedDate.toISOString().slice(0, 19).replace('T', ' ');
  }

  return parsedDate.toLocaleString(locale);
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
  const t = useTranslations('resume.editor');
  const tResumeErrors = useTranslations('resume.errors');
  const tAtsErrors = useTranslations('ats.errors');
  const locale = useLocale();
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US';

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
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [isProfileSectionEnabled, setIsProfileSectionEnabled] = useState(
    initialContent.profile.trim().length > 0
  );
  const [isAtsSectionEnabled, setIsAtsSectionEnabled] = useState(
    initialAtsHistory.length > 0
  );
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);
  const [atsResult, setAtsResult] = useState<AtsScoreResponse | null>(null);
  const [atsHistory, setAtsHistory] = useState<AtsHistoryItem[]>(initialAtsHistory);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewPaperHeight, setPreviewPaperHeight] = useState(
    PREVIEW_PAGE_BASE_HEIGHT
  );

  const saveSequenceRef = useRef(0);
  const isSaveInFlightRef = useRef(false);
  const lastServerUpdatedAtRef = useRef(initialUpdatedAt);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewPaperRef = useRef<HTMLDivElement | null>(null);
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
              tResumeErrors('updatedInAnotherSession'),
            errorPayload.currentUpdatedAt ?? null
          );
        }

        throw new Error(errorPayload?.error || tResumeErrors('autosaveFailed'));
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
        error instanceof Error ? error.message : tResumeErrors('autosaveFailed')
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
        throw new Error(errorPayload?.error || tAtsErrors('analysisFailed'));
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
        error instanceof Error ? error.message : tAtsErrors('analysisFailed')
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
        throw new Error(errorPayload?.error || t('settingsSaveFailed'));
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
        error instanceof Error ? error.message : t('settingsSaveFailed')
      );
    }
  }, [resumeId, settingsPayloadString]);

  const addProfileSection = useCallback(() => {
    setIsProfileSectionEnabled(true);
    setIsAddContentDialogOpen(false);
  }, []);

  const removeProfileSection = useCallback(() => {
    setIsProfileSectionEnabled(false);
    setContent((prev) => ({
      ...prev,
      profile: '',
    }));
  }, []);

  const addExperience = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      experiences: [...prev.experiences, createEmptyExperienceItem()],
    }));
  }, []);

  const addExperienceSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      experiences:
        prev.experiences.length > 0
          ? prev.experiences
          : [createEmptyExperienceItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeExperience = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((item) => item.id !== id),
    }));
  }, []);

  const removeExperienceSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      experiences: [],
    }));
  }, []);

  const addEducation = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      educations: [...prev.educations, createEmptyEducationItem()],
    }));
  }, []);

  const addEducationSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      educations:
        prev.educations.length > 0 ? prev.educations : [createEmptyEducationItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeEducation = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      educations: prev.educations.filter((item) => item.id !== id),
    }));
  }, []);

  const removeEducationSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      educations: [],
    }));
  }, []);

  const addProject = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      projects: [...prev.projects, createEmptyProjectItem()],
    }));
  }, []);

  const addProjectSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      projects:
        prev.projects.length > 0 ? prev.projects : [createEmptyProjectItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeProject = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      projects: prev.projects.filter((item) => item.id !== id),
    }));
  }, []);

  const removeProjectSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      projects: [],
    }));
  }, []);

  const addAtsSection = useCallback(() => {
    setIsAtsSectionEnabled(true);
    setIsAddContentDialogOpen(false);
  }, []);

  const removeAtsSection = useCallback(() => {
    setIsAtsSectionEnabled(false);
    setJobTitle('');
    setCompany('');
    setJobDescription('');
    setAtsError(null);
    setAtsResult(null);
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
  const addableSections = useMemo<AddableSection[]>(
    () => [
      {
        key: 'profile',
        label: t('addable.profile.label'),
        description: t('addable.profile.description'),
        isAdded: isProfileSectionEnabled,
        onAdd: addProfileSection,
      },
      {
        key: 'experiences',
        label: t('addable.experiences.label'),
        description: t('addable.experiences.description'),
        isAdded: content.experiences.length > 0,
        onAdd: addExperienceSection,
      },
      {
        key: 'educations',
        label: t('addable.educations.label'),
        description: t('addable.educations.description'),
        isAdded: content.educations.length > 0,
        onAdd: addEducationSection,
      },
      {
        key: 'projects',
        label: t('addable.projects.label'),
        description: t('addable.projects.description'),
        isAdded: content.projects.length > 0,
        onAdd: addProjectSection,
      },
      {
        key: 'ats',
        label: t('addable.ats.label'),
        description: t('addable.ats.description'),
        isAdded: isAtsSectionEnabled,
        onAdd: addAtsSection,
      },
    ],
    [
      addAtsSection,
      addEducationSection,
      addExperienceSection,
      addProfileSection,
      addProjectSection,
      content.educations.length,
      content.experiences.length,
      content.projects.length,
      isAtsSectionEnabled,
      isProfileSectionEnabled,
      t,
    ]
  );
  const hasHiddenSections = addableSections.some((section) => !section.isAdded);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isAddContentDialogOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddContentDialogOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isAddContentDialogOpen]);

  useEffect(() => {
    const viewportNode = previewViewportRef.current;
    if (!viewportNode) {
      return;
    }

    const updateScale = () => {
      const availableWidth = Math.max(0, viewportNode.clientWidth - 24);
      const nextScale = Math.min(
        1,
        Math.max(0.35, availableWidth / PREVIEW_PAGE_BASE_WIDTH)
      );
      setPreviewScale((prev) =>
        Math.abs(prev - nextScale) < 0.002 ? prev : nextScale
      );
    };

    updateScale();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    observer.observe(viewportNode);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const paperNode = previewPaperRef.current;
    if (!paperNode) {
      return;
    }

    const updatePaperHeight = () => {
      const nextHeight = Math.max(PREVIEW_PAGE_BASE_HEIGHT, paperNode.offsetHeight);
      setPreviewPaperHeight((prev) =>
        Math.abs(prev - nextHeight) < 1 ? prev : nextHeight
      );
    };

    updatePaperHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updatePaperHeight();
    });

    observer.observe(paperNode);
    return () => observer.disconnect();
  }, []);

  const previewFrameWidth = Math.round(PREVIEW_PAGE_BASE_WIDTH * previewScale);
  const previewFrameHeight = Math.round(previewPaperHeight * previewScale);

  return (
    <section className='grid gap-6 lg:grid-cols-12'>
      <div className='space-y-6 lg:col-span-7'>
      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <h2 className='text-lg font-semibold text-stone-900'>{t('resumeTitle')}</h2>
        <input
          type='text'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
          placeholder={t('resumeTitlePlaceholder')}
        />
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>
            {t('viewSettingsTitle')}
          </h2>
          <button
            type='button'
            onClick={() => {
              void runSettingsSave();
            }}
            disabled={!isSettingsDirty || settingsSaveStatus === 'saving'}
            className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400'
          >
            {settingsSaveStatus === 'saving' ? t('saving') : t('saveSettings')}
          </button>
        </div>

        <p className='mt-2 text-sm text-stone-600'>
          {t('viewSettingsDescription')}
        </p>

        <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <label className='space-y-2 text-sm text-stone-700'>
            <span className='font-medium text-stone-900'>{t('templateLabel')}</span>
            <select
              value={settings.templateKey}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  templateKey: normalizeResumeTemplateKey(event.target.value),
                }))
              }
              className='w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
            >
              {RESUME_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {t(template.labelKey)} ·{' '}
                  {template.plan === 'pro'
                    ? t('templatePlanPro')
                    : t('templatePlanFree')}
                </option>
              ))}
            </select>
          </label>

          <label className='space-y-2 text-sm text-stone-700'>
            <span className='font-medium text-stone-900'>{t('colorSchemeLabel')}</span>
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
              <option value='neutral'>{t('colorNeutral')}</option>
              <option value='slate'>{t('colorSlate')}</option>
              <option value='mono'>{t('colorMono')}</option>
            </select>
          </label>

          <label className='space-y-2 text-sm text-stone-700 sm:col-span-2'>
            <span className='font-medium text-stone-900'>
              {t('fontScale', { value: settings.fontScale.toFixed(2) })}
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
              {t('spacingScale', { value: settings.spacingScale.toFixed(2) })}
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
          <span className='font-medium text-stone-900'>{t('statusLabel')}</span>
          <span className='rounded bg-stone-100 px-2 py-0.5 text-stone-700'>
            {settingsSaveStatus === 'saving' && t('saving')}
            {settingsSaveStatus === 'saved' && t('saved')}
            {settingsSaveStatus === 'error' && t('error')}
            {settingsSaveStatus === 'idle' &&
              (isSettingsDirty ? t('dirty') : t('ready'))}
          </span>
          <span className='text-stone-500'>
            {t('lastSaved')}: {formatEditorDateTime(settingsLastSavedAt, isHydrated, dateLocale)}
          </span>
        </div>

        {settingsSaveError ? (
          <p className='mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {settingsSaveError}
          </p>
        ) : null}
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <h2 className='text-lg font-semibold text-stone-900'>{t('personalInfoTitle')}</h2>

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
            placeholder={t('personalFullNamePlaceholder')}
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
            placeholder={t('personalJobTitlePlaceholder')}
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
            placeholder={t('personalEmailPlaceholder')}
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
            placeholder={t('personalPhonePlaceholder')}
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
            placeholder={t('personalAddressPlaceholder')}
          />
        </div>
      </div>

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-stone-900'>{t('contentSectionsTitle')}</h2>
            <p className='mt-1 text-sm text-stone-600'>
              {t('contentSectionsDescription')}
            </p>
          </div>
          <button
            type='button'
            onClick={() => setIsAddContentDialogOpen(true)}
            disabled={!hasHiddenSections}
            className='rounded-lg border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800'
          >
            {hasHiddenSections ? t('addContent') : t('allSectionsAdded')}
          </button>
        </div>
      </div>

      {isProfileSectionEnabled ? (
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>{t('profileSummaryTitle')}</h2>
            <button
              type='button'
              onClick={removeProfileSection}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('removeSection')}
            </button>
          </div>
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
            placeholder={t('profileSummaryPlaceholder')}
          />
        </div>
      ) : null}

      {content.experiences.length > 0 ? (
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>{t('experienceSectionTitle')}</h2>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={addExperience}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('addExperience')}
            </button>
            <button
              type='button'
              onClick={removeExperienceSection}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('removeSection')}
            </button>
          </div>
        </div>

        <div className='mt-4 space-y-4'>
          {content.experiences.map((item) => (
            <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>{t('experienceRecord')}</p>
                  <button
                    type='button'
                    onClick={() => removeExperience(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
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
                    placeholder={t('positionPlaceholder')}
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
                    placeholder={t('companyPlaceholder')}
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
                    placeholder={t('cityPlaceholder')}
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
                    placeholder={t('countryPlaceholder')}
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
                    placeholder={t('startDatePlaceholder')}
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
                    placeholder={t('endDatePlaceholder')}
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
                  placeholder={t('experienceDescriptionPlaceholder')}
                />
              </div>
          ))}
        </div>
      </div>
      ) : null}

      {content.educations.length > 0 ? (
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>{t('educationSectionTitle')}</h2>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={addEducation}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('addEducation')}
            </button>
            <button
              type='button'
              onClick={removeEducationSection}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('removeSection')}
            </button>
          </div>
        </div>

        <div className='mt-4 space-y-4'>
          {content.educations.map((item) => (
            <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>{t('educationRecord')}</p>
                  <button
                    type='button'
                    onClick={() => removeEducation(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
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
                    placeholder={t('schoolPlaceholder')}
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
                    placeholder={t('degreePlaceholder')}
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
                    placeholder={t('cityPlaceholder')}
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
                    placeholder={t('countryPlaceholder')}
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
                    placeholder={t('startDatePlaceholder')}
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
                    placeholder={t('endDatePlaceholder')}
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
                  placeholder={t('educationDescriptionPlaceholder')}
                />
              </div>
          ))}
        </div>
      </div>
      ) : null}

      {content.projects.length > 0 ? (
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>{t('projectSectionTitle')}</h2>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={addProject}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('addProject')}
            </button>
            <button
              type='button'
              onClick={removeProjectSection}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('removeSection')}
            </button>
          </div>
        </div>

        <div className='mt-4 space-y-4'>
          {content.projects.map((item) => (
            <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>{t('projectRecord')}</p>
                  <button
                    type='button'
                    onClick={() => removeProject(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
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
                    placeholder={t('projectNamePlaceholder')}
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
                    placeholder={t('projectSubtitlePlaceholder')}
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
                    placeholder={t('cityPlaceholder')}
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
                    placeholder={t('countryPlaceholder')}
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
                  placeholder={t('stackPlaceholder')}
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
                  placeholder={t('projectDescriptionPlaceholder')}
                />
              </div>
          ))}
        </div>
      </div>
      ) : null}

      {isAtsSectionEnabled ? (
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-stone-900'>{t('atsTitle')}</h2>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => {
                void runAtsAnalysis();
              }}
              disabled={!canRunAtsAnalysis || atsLoading}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400'
            >
              {atsLoading ? t('analyzing') : t('analyzeAts')}
            </button>
            <button
              type='button'
              onClick={removeAtsSection}
              className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('removeSection')}
            </button>
          </div>
        </div>

        <p className='mt-2 text-sm text-stone-600'>
          {t('atsDescription')}
        </p>

        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <input
            type='text'
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            maxLength={120}
            className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
            placeholder={t('jobTitleOptionalPlaceholder')}
          />
          <input
            type='text'
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            maxLength={120}
            className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
            placeholder={t('companyOptionalPlaceholder')}
          />
        </div>

        <textarea
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          rows={8}
          className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
          placeholder={t('jobDescriptionPlaceholder')}
        />

        {!canRunAtsAnalysis ? (
          <p className='mt-2 text-xs text-stone-500'>
            {t('minJobDescription')}
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
              <span className='text-sm font-medium text-stone-700'>{t('overallScore')}</span>
              <span className='rounded bg-stone-900 px-2 py-0.5 text-sm font-semibold text-white'>
                {atsResult.overallScore}/100
              </span>
              <span className='text-xs text-stone-500'>
                {t('algorithm')}: {atsResult.algorithmVersion}
              </span>
            </div>

            <div className='grid grid-cols-1 gap-2 text-sm sm:grid-cols-2'>
              <p className='rounded bg-white px-2 py-1 text-stone-700'>
                {t('keywordCoverage')}: {atsResult.breakdown.keywordCoverage}/50
              </p>
              <p className='rounded bg-white px-2 py-1 text-stone-700'>
                {t('sectionCompleteness')}: {atsResult.breakdown.sectionCompleteness}/25
              </p>
              <p className='rounded bg-white px-2 py-1 text-stone-700'>
                {t('readability')}: {atsResult.breakdown.readability}/15
              </p>
              <p className='rounded bg-white px-2 py-1 text-stone-700'>
                {t('roleAlignment')}: {atsResult.breakdown.roleAlignment}/10
              </p>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div>
                <h3 className='text-sm font-semibold text-stone-800'>
                  {t('matchedKeywords')}
                </h3>
                <p className='mt-1 text-sm text-stone-600'>
                  {atsResult.matchedKeywords.length > 0
                    ? atsResult.matchedKeywords.join(', ')
                    : t('matchedKeywordsEmpty')}
                </p>
              </div>
              <div>
                <h3 className='text-sm font-semibold text-stone-800'>
                  {t('missingKeywords')}
                </h3>
                <p className='mt-1 text-sm text-stone-600'>
                  {atsResult.missingKeywords.length > 0
                    ? atsResult.missingKeywords.join(', ')
                    : t('missingKeywordsEmpty')}
                </p>
              </div>
            </div>

            {atsResult.suggestions.length > 0 ? (
              <div>
                <h3 className='text-sm font-semibold text-stone-800'>{t('suggestions')}</h3>
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
          <h3 className='text-sm font-semibold text-stone-800'>{t('atsHistory')}</h3>
          {atsHistory.length === 0 ? (
            <p className='mt-2 text-sm text-stone-600'>
              {t('atsHistoryEmpty')}
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
                        {item.jobTitle || t('jobTitleNotSpecified')}
                      </p>
                      <p className='text-xs text-stone-500'>
                        {item.company || t('companyNotSpecified')}
                      </p>
                    </div>
                    <span className='rounded bg-stone-900 px-2 py-0.5 text-xs font-semibold text-white'>
                      {item.lastScore ?? 0}/100
                    </span>
                  </div>
                  <p className='mt-1 text-xs text-stone-500'>
                    {formatEditorDateTime(item.updatedAt, isHydrated, dateLocale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      ) : null}

      <div className='rounded-lg border border-stone-200 bg-white p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-sm text-stone-600'>
            {t('autosaveDelayInfo')}
          </p>
          <button
            type='button'
            onClick={() => {
              void runSaveNow();
            }}
            disabled={isAutosaveBlocked || saveStatus === 'saving'}
            className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400'
          >
            {t('saveNow')}
          </button>
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-2 text-sm'>
          <span className='font-medium text-stone-900'>{t('statusLabel')}</span>
          <span className='rounded bg-stone-100 px-2 py-0.5 text-stone-700'>
            {saveStatus === 'saving' && t('saving')}
            {saveStatus === 'saved' && t('saved')}
            {saveStatus === 'error' && t('error')}
            {saveStatus === 'idle' && (isDirty ? t('dirty') : t('ready'))}
          </span>
          <span className='text-stone-500'>
            {t('lastSaved')}: {formatEditorDateTime(lastSavedAt, isHydrated, dateLocale)}
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
            {t('refreshPage')}
          </button>
        ) : null}
      </div>
      </div>

      <aside className='no-print h-fit lg:col-span-5 lg:sticky lg:top-6'>
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>{t('livePreview')}</h2>
            <Link
              href={`/resumes/${resumeId}/preview`}
              className='rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-stone-500'
            >
              {t('openSeparatePage')}
            </Link>
          </div>

          <div
            ref={previewViewportRef}
            className='max-h-[72vh] overflow-auto rounded-md border border-stone-200 bg-stone-50 p-3'
          >
            <div
              className='mx-auto'
              style={{
                width: `${previewFrameWidth}px`,
                height: `${previewFrameHeight}px`,
              }}
            >
              <div
                ref={previewPaperRef}
                style={{
                  width: `${PREVIEW_PAGE_BASE_WIDTH}px`,
                  minHeight: `${PREVIEW_PAGE_BASE_HEIGHT}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <PaginatedResumePreview
                  title={title}
                  content={content}
                  settings={settings}
                  mode='editor'
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {isAddContentDialogOpen ? (
        <div
          className='no-print fixed inset-0 z-40 flex items-center justify-center bg-stone-900/40 p-4'
          onClick={() => setIsAddContentDialogOpen(false)}
        >
          <div
            role='dialog'
            aria-modal='true'
            aria-label={t('addContentDialogAriaLabel')}
            onClick={(event) => event.stopPropagation()}
            className='w-full max-w-4xl rounded-lg border border-stone-200 bg-white p-6'
          >
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='text-2xl font-bold text-stone-900'>{t('addContentDialogTitle')}</h2>
                <p className='mt-1 text-sm text-stone-600'>
                  {t('addContentDialogDescription')}
                </p>
              </div>
              <button
                type='button'
                onClick={() => setIsAddContentDialogOpen(false)}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('close')}
              </button>
            </div>

            <ul className='mt-5 grid grid-cols-1 gap-3 md:grid-cols-2'>
              {addableSections.map((section) => (
                <li key={section.key}>
                  <button
                    type='button'
                    disabled={section.isAdded}
                    onClick={section.onAdd}
                    className='w-full rounded-lg border border-stone-200 px-4 py-3 text-left transition hover:border-stone-400 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-50'
                  >
                    <p className='text-base font-semibold text-stone-900'>{section.label}</p>
                    <p className='mt-1 text-sm text-stone-600'>{section.description}</p>
                    <p className='mt-2 text-xs font-medium text-stone-500'>
                      {section.isAdded ? t('sectionAlreadyAdded') : t('addSection')}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
