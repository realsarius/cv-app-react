'use client';

import { Link } from '@/i18n/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  RESUME_TEMPLATES,
  normalizeResumeTemplateKey,
} from '@/templates/resume/registry';
import type { ResumeTemplateKey } from '@/templates/resume/types';
import {
  ADDABLE_SECTION_REGISTRY,
  type AddableSectionKey,
} from './sections/addable-section-registry';
import PaginatedResumePreview from './preview/PaginatedResumePreview';
import {
  PREVIEW_PAGE_BASE_HEIGHT,
  PREVIEW_PAGE_BASE_WIDTH,
} from './preview/paginate';
import type {
  ResumeAwardItem,
  ResumeCertificateItem,
  ResumeCustomSection,
  ResumeCustomSectionItem,
  ResumeCourseItem,
  ResumeContent,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeInterestItem,
  ResumeLanguageItem,
  ResumeOrganisationItem,
  ResumePublicationItem,
  ResumeProjectItem,
  ResumeReferenceItem,
  ResumeSkillItem,
  ResumeContentSectionOrderKey,
} from './content';
import { resolveSectionOrder } from './section-order';

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
  key: AddableSectionKey;
  label: string;
  description: string;
  isAdded: boolean;
  onAdd: () => void;
};

const ATS_SECTION_VISIBILITY_STORAGE_KEY = 'resume-editor:ats-section-visible';

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

function getAtsSectionVisibilityStorageKey(resumeId: string) {
  return `${ATS_SECTION_VISIBILITY_STORAGE_KEY}:${resumeId}`;
}

function readAtsSectionVisibility(resumeId: string): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.localStorage.getItem(getAtsSectionVisibilityStorageKey(resumeId));
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  } catch {
    return null;
  }

  return null;
}

function writeAtsSectionVisibility(resumeId: string, isEnabled: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      getAtsSectionVisibilityStorageKey(resumeId),
      String(isEnabled)
    );
  } catch {
    // Ignore storage errors (private mode / disabled storage).
  }
}

type SortableSectionCardProps = {
  sectionKey: ResumeContentSectionOrderKey;
  order: number;
  dragHandleAriaLabel: string;
  children: ReactNode;
};

function SortableSectionCard({
  sectionKey,
  order,
  dragHandleAriaLabel,
  children,
}: SortableSectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionKey,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    order,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative transition-[transform,opacity,box-shadow] duration-200 ${
        isDragging ? 'z-20 opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        type='button'
        {...attributes}
        {...listeners}
        aria-label={dragHandleAriaLabel}
        className='absolute right-3 top-3 z-10 cursor-grab p-1 text-stone-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-stone-600 active:cursor-grabbing focus-visible:opacity-100 pointer-events-none group-hover:pointer-events-auto focus-visible:pointer-events-auto'
      >
        <GripVertical className='h-4 w-4' aria-hidden='true' />
      </button>
      <div className='pr-10'>{children}</div>
    </div>
  );
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

function createEmptySkillItem(): ResumeSkillItem {
  return {
    id: createItemId(),
    name: '',
    level: 'intermediate',
  };
}

function createEmptyLanguageItem(): ResumeLanguageItem {
  return {
    id: createItemId(),
    name: '',
    proficiency: 'intermediate',
  };
}

function createEmptyCertificateItem(): ResumeCertificateItem {
  return {
    id: createItemId(),
    name: '',
    issuer: '',
    date: '',
    url: '',
    credentialId: '',
  };
}

function createEmptyAwardItem(): ResumeAwardItem {
  return {
    id: createItemId(),
    title: '',
    issuer: '',
    date: '',
    description: '',
  };
}

function createEmptyInterestItem(): ResumeInterestItem {
  return {
    id: createItemId(),
    name: '',
  };
}

function createEmptyCourseItem(): ResumeCourseItem {
  return {
    id: createItemId(),
    name: '',
    institution: '',
    date: '',
    url: '',
  };
}

function createEmptyReferenceItem(): ResumeReferenceItem {
  return {
    id: createItemId(),
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    relationship: '',
  };
}

function createEmptyOrganisationItem(): ResumeOrganisationItem {
  return {
    id: createItemId(),
    name: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
  };
}

function createEmptyPublicationItem(): ResumePublicationItem {
  return {
    id: createItemId(),
    title: '',
    publisher: '',
    date: '',
    url: '',
    description: '',
  };
}

function createEmptyCustomSectionItem(): ResumeCustomSectionItem {
  return {
    id: createItemId(),
    heading: '',
    subheading: '',
    date: '',
    description: '',
  };
}

function createEmptyCustomSection(): ResumeCustomSection {
  return {
    id: createItemId(),
    title: '',
    items: [createEmptyCustomSectionItem()],
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
  const [isAtsVisibilityLoaded, setIsAtsVisibilityLoaded] = useState(false);
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

  const defaultAtsSectionVisibility = initialAtsHistory.length > 0;

  useEffect(() => {
    const storedVisibility = readAtsSectionVisibility(resumeId);
    setIsAtsSectionEnabled(storedVisibility ?? defaultAtsSectionVisibility);
    setIsAtsVisibilityLoaded(true);
  }, [defaultAtsSectionVisibility, resumeId]);

  useEffect(() => {
    if (!isAtsVisibilityLoaded) {
      return;
    }

    writeAtsSectionVisibility(resumeId, isAtsSectionEnabled);
  }, [isAtsSectionEnabled, isAtsVisibilityLoaded, resumeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleSectionKeys = useMemo<ResumeContentSectionOrderKey[]>(
    () => [
      ...(isProfileSectionEnabled ? (['profile'] as const) : []),
      ...(content.experiences.length > 0 ? (['experiences'] as const) : []),
      ...(content.educations.length > 0 ? (['educations'] as const) : []),
      ...(content.projects.length > 0 ? (['projects'] as const) : []),
      ...(content.skills.length > 0 ? (['skills'] as const) : []),
      ...(content.languages.length > 0 ? (['languages'] as const) : []),
      ...(content.certificates.length > 0 ? (['certificates'] as const) : []),
      ...(content.awards.length > 0 ? (['awards'] as const) : []),
      ...(content.interests.length > 0 ? (['interests'] as const) : []),
      ...(content.courses.length > 0 ? (['courses'] as const) : []),
      ...(content.references.length > 0 ? (['references'] as const) : []),
      ...(content.organisations.length > 0 ? (['organisations'] as const) : []),
      ...(content.publications.length > 0 ? (['publications'] as const) : []),
      ...(content.customSections.length > 0 ? (['customSections'] as const) : []),
    ],
    [
      content.awards.length,
      content.certificates.length,
      content.courses.length,
      content.customSections.length,
      content.educations.length,
      content.experiences.length,
      content.interests.length,
      content.languages.length,
      content.organisations.length,
      content.projects.length,
      content.publications.length,
      content.references.length,
      content.skills.length,
      isProfileSectionEnabled,
    ]
  );

  const resolvedSectionOrder = useMemo(
    () => resolveSectionOrder(content.sectionOrder),
    [content.sectionOrder]
  );

  const visibleSectionKeySet = useMemo(
    () => new Set<ResumeContentSectionOrderKey>(visibleSectionKeys),
    [visibleSectionKeys]
  );

  const orderedVisibleSectionKeys = useMemo(
    () => resolvedSectionOrder.filter((key) => visibleSectionKeySet.has(key)),
    [resolvedSectionOrder, visibleSectionKeySet]
  );

  const sectionOrderIndex = useMemo(() => {
    return resolvedSectionOrder.reduce(
      (acc, key, index) => {
        acc[key] = index;
        return acc;
      },
      {} as Record<ResumeContentSectionOrderKey, number>
    );
  }, [resolvedSectionOrder]);

  const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeKey = String(active.id) as ResumeContentSectionOrderKey;
    const overKey = String(over.id) as ResumeContentSectionOrderKey;

    setContent((prev) => {
      const currentOrder = resolveSectionOrder(prev.sectionOrder);
      const oldIndex = currentOrder.indexOf(activeKey);
      const newIndex = currentOrder.indexOf(overKey);
      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      return {
        ...prev,
        sectionOrder: arrayMove(currentOrder, oldIndex, newIndex),
      };
    });
  }, []);

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

  const addSkill = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      skills: [...prev.skills, createEmptySkillItem()],
    }));
  }, []);

  const addSkillsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      skills: prev.skills.length > 0 ? prev.skills : [createEmptySkillItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeSkill = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      skills: prev.skills.filter((item) => item.id !== id),
    }));
  }, []);

  const removeSkillsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      skills: [],
    }));
  }, []);

  const addLanguage = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      languages: [...prev.languages, createEmptyLanguageItem()],
    }));
  }, []);

  const addLanguagesSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      languages:
        prev.languages.length > 0
          ? prev.languages
          : [createEmptyLanguageItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeLanguage = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      languages: prev.languages.filter((item) => item.id !== id),
    }));
  }, []);

  const removeLanguagesSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      languages: [],
    }));
  }, []);

  const addCertificate = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      certificates: [...prev.certificates, createEmptyCertificateItem()],
    }));
  }, []);

  const addCertificatesSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      certificates:
        prev.certificates.length > 0
          ? prev.certificates
          : [createEmptyCertificateItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeCertificate = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((item) => item.id !== id),
    }));
  }, []);

  const removeCertificatesSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      certificates: [],
    }));
  }, []);

  const addAward = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      awards: [...prev.awards, createEmptyAwardItem()],
    }));
  }, []);

  const addAwardsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      awards: prev.awards.length > 0 ? prev.awards : [createEmptyAwardItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeAward = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      awards: prev.awards.filter((item) => item.id !== id),
    }));
  }, []);

  const removeAwardsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      awards: [],
    }));
  }, []);

  const addInterest = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      interests: [...prev.interests, createEmptyInterestItem()],
    }));
  }, []);

  const addInterestsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      interests:
        prev.interests.length > 0 ? prev.interests : [createEmptyInterestItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeInterest = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      interests: prev.interests.filter((item) => item.id !== id),
    }));
  }, []);

  const removeInterestsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      interests: [],
    }));
  }, []);

  const addCourse = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      courses: [...prev.courses, createEmptyCourseItem()],
    }));
  }, []);

  const addCoursesSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      courses: prev.courses.length > 0 ? prev.courses : [createEmptyCourseItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeCourse = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      courses: prev.courses.filter((item) => item.id !== id),
    }));
  }, []);

  const removeCoursesSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      courses: [],
    }));
  }, []);

  const addReference = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      references: [...prev.references, createEmptyReferenceItem()],
    }));
  }, []);

  const addReferencesSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      references:
        prev.references.length > 0
          ? prev.references
          : [createEmptyReferenceItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeReference = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      references: prev.references.filter((item) => item.id !== id),
    }));
  }, []);

  const removeReferencesSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      references: [],
    }));
  }, []);

  const addOrganisation = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      organisations: [...prev.organisations, createEmptyOrganisationItem()],
    }));
  }, []);

  const addOrganisationsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      organisations:
        prev.organisations.length > 0
          ? prev.organisations
          : [createEmptyOrganisationItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeOrganisation = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      organisations: prev.organisations.filter((item) => item.id !== id),
    }));
  }, []);

  const removeOrganisationsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      organisations: [],
    }));
  }, []);

  const addPublication = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      publications: [...prev.publications, createEmptyPublicationItem()],
    }));
  }, []);

  const addPublicationsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      publications:
        prev.publications.length > 0
          ? prev.publications
          : [createEmptyPublicationItem()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removePublication = useCallback((id: string) => {
    setContent((prev) => ({
      ...prev,
      publications: prev.publications.filter((item) => item.id !== id),
    }));
  }, []);

  const removePublicationsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      publications: [],
    }));
  }, []);

  const addCustomSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      customSections: [...prev.customSections, createEmptyCustomSection()],
    }));
  }, []);

  const addCustomSectionsSection = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      customSections:
        prev.customSections.length > 0
          ? prev.customSections
          : [createEmptyCustomSection()],
    }));
    setIsAddContentDialogOpen(false);
  }, []);

  const removeCustomSection = useCallback((sectionId: string) => {
    setContent((prev) => ({
      ...prev,
      customSections: prev.customSections.filter(
        (section) => section.id !== sectionId
      ),
    }));
  }, []);

  const removeCustomSectionsAll = useCallback(() => {
    setContent((prev) => ({
      ...prev,
      customSections: [],
    }));
  }, []);

  const addCustomSectionItem = useCallback((sectionId: string) => {
    setContent((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [...section.items, createEmptyCustomSectionItem()],
            }
          : section
      ),
    }));
  }, []);

  const removeCustomSectionItem = useCallback(
    (sectionId: string, itemId: string) => {
      setContent((prev) => ({
        ...prev,
        customSections: prev.customSections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.filter((item) => item.id !== itemId),
              }
            : section
        ),
      }));
    },
    []
  );

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

  const addableSectionState = useMemo<
    Record<
      AddableSectionKey,
      {
        isAdded: boolean;
        onAdd: () => void;
      }
    >
  >(
    () => ({
      profile: {
        isAdded: isProfileSectionEnabled,
        onAdd: addProfileSection,
      },
      experiences: {
        isAdded: content.experiences.length > 0,
        onAdd: addExperienceSection,
      },
      educations: {
        isAdded: content.educations.length > 0,
        onAdd: addEducationSection,
      },
      projects: {
        isAdded: content.projects.length > 0,
        onAdd: addProjectSection,
      },
      skills: {
        isAdded: content.skills.length > 0,
        onAdd: addSkillsSection,
      },
      languages: {
        isAdded: content.languages.length > 0,
        onAdd: addLanguagesSection,
      },
      certificates: {
        isAdded: content.certificates.length > 0,
        onAdd: addCertificatesSection,
      },
      awards: {
        isAdded: content.awards.length > 0,
        onAdd: addAwardsSection,
      },
      interests: {
        isAdded: content.interests.length > 0,
        onAdd: addInterestsSection,
      },
      courses: {
        isAdded: content.courses.length > 0,
        onAdd: addCoursesSection,
      },
      references: {
        isAdded: content.references.length > 0,
        onAdd: addReferencesSection,
      },
      organisations: {
        isAdded: content.organisations.length > 0,
        onAdd: addOrganisationsSection,
      },
      publications: {
        isAdded: content.publications.length > 0,
        onAdd: addPublicationsSection,
      },
      customSections: {
        isAdded: content.customSections.length > 0,
        onAdd: addCustomSectionsSection,
      },
      ats: {
        isAdded: isAtsSectionEnabled,
        onAdd: addAtsSection,
      },
    }),
    [
      addAtsSection,
      addAwardsSection,
      addCertificatesSection,
      addCustomSectionsSection,
      addCoursesSection,
      addEducationSection,
      addExperienceSection,
      addInterestsSection,
      addLanguagesSection,
      addOrganisationsSection,
      addPublicationsSection,
      addProfileSection,
      addProjectSection,
      addReferencesSection,
      addSkillsSection,
      content.awards.length,
      content.certificates.length,
      content.customSections.length,
      content.courses.length,
      content.educations.length,
      content.experiences.length,
      content.interests.length,
      content.languages.length,
      content.organisations.length,
      content.publications.length,
      content.projects.length,
      content.references.length,
      content.skills.length,
      isAtsSectionEnabled,
      isProfileSectionEnabled,
    ]
  );

  const addableSections = useMemo<AddableSection[]>(
    () =>
      ADDABLE_SECTION_REGISTRY.map((section) => ({
        key: section.key,
        label: t(section.labelKey),
        description: t(section.descriptionKey),
        ...addableSectionState[section.key],
      })),
    [
      addableSectionState,
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
      <div className='space-y-6 lg:col-span-6'>
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
            {orderedVisibleSectionKeys.length > 1 ? (
              <p className='mt-1 text-xs text-stone-500'>{t('reorderSectionsHint')}</p>
            ) : null}
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={orderedVisibleSectionKeys}
          strategy={verticalListSortingStrategy}
        >
          <div className='flex flex-col gap-6'>
      {isProfileSectionEnabled ? (
        <SortableSectionCard
          sectionKey='profile'
          order={sectionOrderIndex.profile ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('profileSummaryTitle'),
          })}
        >
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
        </SortableSectionCard>
      ) : null}

      {content.experiences.length > 0 ? (
        <SortableSectionCard
          sectionKey='experiences'
          order={sectionOrderIndex.experiences ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('experienceSectionTitle'),
          })}
        >
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
      </SortableSectionCard>
      ) : null}

      {content.educations.length > 0 ? (
        <SortableSectionCard
          sectionKey='educations'
          order={sectionOrderIndex.educations ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('educationSectionTitle'),
          })}
        >
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
      </SortableSectionCard>
      ) : null}

      {content.projects.length > 0 ? (
        <SortableSectionCard
          sectionKey='projects'
          order={sectionOrderIndex.projects ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('projectSectionTitle'),
          })}
        >
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
      </SortableSectionCard>
      ) : null}

      {content.skills.length > 0 ? (
        <SortableSectionCard
          sectionKey='skills'
          order={sectionOrderIndex.skills ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('skillsSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('skillsSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addSkill}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addSkill')}
              </button>
              <button
                type='button'
                onClick={removeSkillsSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.skills.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('skillRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removeSkill(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.name}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        skills: prev.skills.map((skill) =>
                          skill.id === item.id
                            ? { ...skill, name: event.target.value }
                            : skill
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('skillNamePlaceholder')}
                  />
                  <select
                    value={item.level}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        skills: prev.skills.map((skill) =>
                          skill.id === item.id
                            ? {
                                ...skill,
                                level:
                                  event.target.value === 'beginner' ||
                                  event.target.value === 'advanced' ||
                                  event.target.value === 'expert'
                                    ? event.target.value
                                    : 'intermediate',
                              }
                            : skill
                        ),
                      }))
                    }
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  >
                    <option value='beginner'>{t('skillLevel.beginner')}</option>
                    <option value='intermediate'>
                      {t('skillLevel.intermediate')}
                    </option>
                    <option value='advanced'>{t('skillLevel.advanced')}</option>
                    <option value='expert'>{t('skillLevel.expert')}</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.languages.length > 0 ? (
        <SortableSectionCard
          sectionKey='languages'
          order={sectionOrderIndex.languages ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('languagesSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('languagesSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addLanguage}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addLanguage')}
              </button>
              <button
                type='button'
                onClick={removeLanguagesSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.languages.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('languageRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removeLanguage(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.name}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        languages: prev.languages.map((language) =>
                          language.id === item.id
                            ? { ...language, name: event.target.value }
                            : language
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('languageNamePlaceholder')}
                  />
                  <select
                    value={item.proficiency}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        languages: prev.languages.map((language) =>
                          language.id === item.id
                            ? {
                                ...language,
                                proficiency:
                                  event.target.value === 'native' ||
                                  event.target.value === 'fluent' ||
                                  event.target.value === 'advanced' ||
                                  event.target.value === 'basic'
                                    ? event.target.value
                                    : 'intermediate',
                              }
                            : language
                        ),
                      }))
                    }
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  >
                    <option value='native'>{t('languageLevel.native')}</option>
                    <option value='fluent'>{t('languageLevel.fluent')}</option>
                    <option value='advanced'>{t('languageLevel.advanced')}</option>
                    <option value='intermediate'>
                      {t('languageLevel.intermediate')}
                    </option>
                    <option value='basic'>{t('languageLevel.basic')}</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.certificates.length > 0 ? (
        <SortableSectionCard
          sectionKey='certificates'
          order={sectionOrderIndex.certificates ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('certificatesSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('certificatesSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addCertificate}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addCertificate')}
              </button>
              <button
                type='button'
                onClick={removeCertificatesSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.certificates.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('certificateRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removeCertificate(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.name}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        certificates: prev.certificates.map((certificate) =>
                          certificate.id === item.id
                            ? { ...certificate, name: event.target.value }
                            : certificate
                        ),
                      }))
                    }
                    maxLength={160}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('certificateNamePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.issuer}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        certificates: prev.certificates.map((certificate) =>
                          certificate.id === item.id
                            ? { ...certificate, issuer: event.target.value }
                            : certificate
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('issuerPlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.date}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        certificates: prev.certificates.map((certificate) =>
                          certificate.id === item.id
                            ? { ...certificate, date: event.target.value }
                            : certificate
                        ),
                      }))
                    }
                    maxLength={20}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('certificateDatePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.credentialId}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        certificates: prev.certificates.map((certificate) =>
                          certificate.id === item.id
                            ? { ...certificate, credentialId: event.target.value }
                            : certificate
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('credentialIdPlaceholder')}
                  />
                </div>

                <input
                  type='url'
                  value={item.url}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      certificates: prev.certificates.map((certificate) =>
                        certificate.id === item.id
                          ? { ...certificate, url: event.target.value }
                          : certificate
                      ),
                    }))
                  }
                  maxLength={240}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder={t('certificateUrlPlaceholder')}
                />
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.awards.length > 0 ? (
        <SortableSectionCard
          sectionKey='awards'
          order={sectionOrderIndex.awards ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('awardsSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('awardsSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addAward}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addAward')}
              </button>
              <button
                type='button'
                onClick={removeAwardsSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.awards.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('awardRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removeAward(item.id)}
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
                        awards: prev.awards.map((award) =>
                          award.id === item.id
                            ? { ...award, title: event.target.value }
                            : award
                        ),
                      }))
                    }
                    maxLength={160}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('awardTitlePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.issuer}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        awards: prev.awards.map((award) =>
                          award.id === item.id
                            ? { ...award, issuer: event.target.value }
                            : award
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('issuerPlaceholder')}
                  />
                </div>

                <input
                  type='text'
                  value={item.date}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      awards: prev.awards.map((award) =>
                        award.id === item.id
                          ? { ...award, date: event.target.value }
                          : award
                      ),
                    }))
                  }
                  maxLength={20}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder={t('awardDatePlaceholder')}
                />

                <textarea
                  value={item.description}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      awards: prev.awards.map((award) =>
                        award.id === item.id
                          ? { ...award, description: event.target.value }
                          : award
                      ),
                    }))
                  }
                  rows={3}
                  maxLength={1000}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder={t('awardDescriptionPlaceholder')}
                />
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.interests.length > 0 ? (
        <SortableSectionCard
          sectionKey='interests'
          order={sectionOrderIndex.interests ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('interestsSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('interestsSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addInterest}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addInterest')}
              </button>
              <button
                type='button'
                onClick={removeInterestsSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.interests.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('interestRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removeInterest(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
                  </button>
                </div>
                <input
                  type='text'
                  value={item.name}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      interests: prev.interests.map((interest) =>
                        interest.id === item.id
                          ? { ...interest, name: event.target.value }
                          : interest
                      ),
                    }))
                  }
                  maxLength={120}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder={t('interestNamePlaceholder')}
                />
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.courses.length > 0 ? (
        <SortableSectionCard
          sectionKey='courses'
          order={sectionOrderIndex.courses ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('coursesSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('coursesSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addCourse}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addCourse')}
              </button>
              <button
                type='button'
                onClick={removeCoursesSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.courses.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('courseRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removeCourse(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.name}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        courses: prev.courses.map((course) =>
                          course.id === item.id
                            ? { ...course, name: event.target.value }
                            : course
                        ),
                      }))
                    }
                    maxLength={160}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('courseNamePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.institution}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        courses: prev.courses.map((course) =>
                          course.id === item.id
                            ? { ...course, institution: event.target.value }
                            : course
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('institutionPlaceholder')}
                  />
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.date}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        courses: prev.courses.map((course) =>
                          course.id === item.id
                            ? { ...course, date: event.target.value }
                            : course
                        ),
                      }))
                    }
                    maxLength={20}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('courseDatePlaceholder')}
                  />
                  <input
                    type='url'
                    value={item.url}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        courses: prev.courses.map((course) =>
                          course.id === item.id
                            ? { ...course, url: event.target.value }
                            : course
                        ),
                      }))
                    }
                    maxLength={240}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('courseUrlPlaceholder')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.references.length > 0 ? (
        <SortableSectionCard
          sectionKey='references'
          order={sectionOrderIndex.references ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('referencesSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('referencesSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addReference}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addReference')}
              </button>
              <button
                type='button'
                onClick={removeReferencesSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.references.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('referenceRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removeReference(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.name}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        references: prev.references.map((reference) =>
                          reference.id === item.id
                            ? { ...reference, name: event.target.value }
                            : reference
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('referenceNamePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.title}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        references: prev.references.map((reference) =>
                          reference.id === item.id
                            ? { ...reference, title: event.target.value }
                            : reference
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('referenceTitlePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.company}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        references: prev.references.map((reference) =>
                          reference.id === item.id
                            ? { ...reference, company: event.target.value }
                            : reference
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('companyPlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.relationship}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        references: prev.references.map((reference) =>
                          reference.id === item.id
                            ? { ...reference, relationship: event.target.value }
                            : reference
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('relationshipPlaceholder')}
                  />
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='email'
                    value={item.email}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        references: prev.references.map((reference) =>
                          reference.id === item.id
                            ? { ...reference, email: event.target.value }
                            : reference
                        ),
                      }))
                    }
                    maxLength={160}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('referenceEmailPlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.phone}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        references: prev.references.map((reference) =>
                          reference.id === item.id
                            ? { ...reference, phone: event.target.value }
                            : reference
                        ),
                      }))
                    }
                    maxLength={64}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('referencePhonePlaceholder')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.organisations.length > 0 ? (
        <SortableSectionCard
          sectionKey='organisations'
          order={sectionOrderIndex.organisations ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('organisationsSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('organisationsSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addOrganisation}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addOrganisation')}
              </button>
              <button
                type='button'
                onClick={removeOrganisationsSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.organisations.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('organisationRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removeOrganisation(item.id)}
                    className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                  >
                    {t('delete')}
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <input
                    type='text'
                    value={item.name}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        organisations: prev.organisations.map((organisation) =>
                          organisation.id === item.id
                            ? { ...organisation, name: event.target.value }
                            : organisation
                        ),
                      }))
                    }
                    maxLength={160}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('organisationNamePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.role}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        organisations: prev.organisations.map((organisation) =>
                          organisation.id === item.id
                            ? { ...organisation, role: event.target.value }
                            : organisation
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('organisationRolePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.startDate}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        organisations: prev.organisations.map((organisation) =>
                          organisation.id === item.id
                            ? { ...organisation, startDate: event.target.value }
                            : organisation
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
                        organisations: prev.organisations.map((organisation) =>
                          organisation.id === item.id
                            ? { ...organisation, endDate: event.target.value }
                            : organisation
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
                      organisations: prev.organisations.map((organisation) =>
                        organisation.id === item.id
                          ? { ...organisation, description: event.target.value }
                          : organisation
                      ),
                    }))
                  }
                  rows={3}
                  maxLength={1200}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder={t('organisationDescriptionPlaceholder')}
                />
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.publications.length > 0 ? (
        <SortableSectionCard
          sectionKey='publications'
          order={sectionOrderIndex.publications ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('publicationsSectionTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('publicationsSectionTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addPublication}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addPublication')}
              </button>
              <button
                type='button'
                onClick={removePublicationsSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.publications.map((item) => (
              <div key={item.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('publicationRecord')}
                  </p>
                  <button
                    type='button'
                    onClick={() => removePublication(item.id)}
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
                        publications: prev.publications.map((publication) =>
                          publication.id === item.id
                            ? { ...publication, title: event.target.value }
                            : publication
                        ),
                      }))
                    }
                    maxLength={180}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('publicationTitlePlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.publisher}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        publications: prev.publications.map((publication) =>
                          publication.id === item.id
                            ? { ...publication, publisher: event.target.value }
                            : publication
                        ),
                      }))
                    }
                    maxLength={120}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('publisherPlaceholder')}
                  />
                  <input
                    type='text'
                    value={item.date}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        publications: prev.publications.map((publication) =>
                          publication.id === item.id
                            ? { ...publication, date: event.target.value }
                            : publication
                        ),
                      }))
                    }
                    maxLength={20}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('publicationDatePlaceholder')}
                  />
                  <input
                    type='url'
                    value={item.url}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        publications: prev.publications.map((publication) =>
                          publication.id === item.id
                            ? { ...publication, url: event.target.value }
                            : publication
                        ),
                      }))
                    }
                    maxLength={240}
                    className='rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                    placeholder={t('publicationUrlPlaceholder')}
                  />
                </div>

                <textarea
                  value={item.description}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      publications: prev.publications.map((publication) =>
                        publication.id === item.id
                          ? { ...publication, description: event.target.value }
                          : publication
                      ),
                    }))
                  }
                  rows={3}
                  maxLength={1500}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder={t('publicationDescriptionPlaceholder')}
                />
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}

      {content.customSections.length > 0 ? (
        <SortableSectionCard
          sectionKey='customSections'
          order={sectionOrderIndex.customSections ?? 0}
          dragHandleAriaLabel={t('dragHandleAria', {
            section: t('customSectionsTitle'),
          })}
        >
        <div className='rounded-lg border border-stone-200 bg-white p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold text-stone-900'>
              {t('customSectionsTitle')}
            </h2>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={addCustomSection}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('addCustomSection')}
              </button>
              <button
                type='button'
                onClick={removeCustomSectionsAll}
                className='rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('removeSection')}
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            {content.customSections.map((section) => (
              <div key={section.id} className='rounded-lg border border-stone-200 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-800'>
                    {t('customSectionRecord')}
                  </p>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => addCustomSectionItem(section.id)}
                      className='rounded border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-500'
                    >
                      {t('addCustomItem')}
                    </button>
                    <button
                      type='button'
                      onClick={() => removeCustomSection(section.id)}
                      className='rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50'
                    >
                      {t('removeCustomSection')}
                    </button>
                  </div>
                </div>

                <input
                  type='text'
                  value={section.title}
                  onChange={(event) =>
                    setContent((prev) => ({
                      ...prev,
                      customSections: prev.customSections.map((customSection) =>
                        customSection.id === section.id
                          ? { ...customSection, title: event.target.value }
                          : customSection
                      ),
                    }))
                  }
                  maxLength={120}
                  className='mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500'
                  placeholder={t('customSectionTitlePlaceholder')}
                />

                <div className='mt-3 space-y-3'>
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className='rounded-md border border-stone-200 p-3'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-xs font-semibold text-stone-700'>
                          {t('customItemRecord')}
                        </p>
                        <button
                          type='button'
                          onClick={() => removeCustomSectionItem(section.id, item.id)}
                          className='rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50'
                        >
                          {t('delete')}
                        </button>
                      </div>

                      <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2'>
                        <input
                          type='text'
                          value={item.heading}
                          onChange={(event) =>
                            setContent((prev) => ({
                              ...prev,
                              customSections: prev.customSections.map((customSection) =>
                                customSection.id === section.id
                                  ? {
                                      ...customSection,
                                      items: customSection.items.map((customItem) =>
                                        customItem.id === item.id
                                          ? {
                                              ...customItem,
                                              heading: event.target.value,
                                            }
                                          : customItem
                                      ),
                                    }
                                  : customSection
                              ),
                            }))
                          }
                          maxLength={160}
                          className='rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-500'
                          placeholder={t('customItemHeadingPlaceholder')}
                        />
                        <input
                          type='text'
                          value={item.subheading}
                          onChange={(event) =>
                            setContent((prev) => ({
                              ...prev,
                              customSections: prev.customSections.map((customSection) =>
                                customSection.id === section.id
                                  ? {
                                      ...customSection,
                                      items: customSection.items.map((customItem) =>
                                        customItem.id === item.id
                                          ? {
                                              ...customItem,
                                              subheading: event.target.value,
                                            }
                                          : customItem
                                      ),
                                    }
                                  : customSection
                              ),
                            }))
                          }
                          maxLength={160}
                          className='rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-500'
                          placeholder={t('customItemSubheadingPlaceholder')}
                        />
                      </div>

                      <input
                        type='text'
                        value={item.date}
                        onChange={(event) =>
                          setContent((prev) => ({
                            ...prev,
                            customSections: prev.customSections.map((customSection) =>
                              customSection.id === section.id
                                ? {
                                    ...customSection,
                                    items: customSection.items.map((customItem) =>
                                      customItem.id === item.id
                                        ? { ...customItem, date: event.target.value }
                                        : customItem
                                    ),
                                  }
                                : customSection
                            ),
                          }))
                        }
                        maxLength={20}
                        className='mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-500'
                        placeholder={t('customItemDatePlaceholder')}
                      />

                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          setContent((prev) => ({
                            ...prev,
                            customSections: prev.customSections.map((customSection) =>
                              customSection.id === section.id
                                ? {
                                    ...customSection,
                                    items: customSection.items.map((customItem) =>
                                      customItem.id === item.id
                                        ? {
                                            ...customItem,
                                            description: event.target.value,
                                          }
                                        : customItem
                                    ),
                                  }
                                : customSection
                            ),
                          }))
                        }
                        rows={3}
                        maxLength={1500}
                        className='mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-500'
                        placeholder={t('customItemDescriptionPlaceholder')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </SortableSectionCard>
      ) : null}
          </div>
        </SortableContext>
      </DndContext>

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

      <aside className='no-print h-fit lg:col-span-6 lg:sticky lg:top-6'>
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
