import type { ResumeContent } from '@/features/resume-editor/content';
import type { ResumeTemplateKey } from '@/templates/resume/types';
import ResumePreviewDocument from './ResumePreviewDocument';
import {
  paginateResumeContent,
  PREVIEW_PAGE_BASE_HEIGHT,
} from './paginate';

type PreviewVisualSettings = {
  templateKey: ResumeTemplateKey;
  fontScale: number;
  spacingScale: number;
  colorScheme: 'neutral' | 'slate' | 'mono';
};

type PaginatedResumePreviewProps = {
  title: string;
  content: ResumeContent;
  settings: PreviewVisualSettings;
  mode?: 'editor' | 'preview';
};

export default function PaginatedResumePreview({
  title,
  content,
  settings,
  mode = 'editor',
}: PaginatedResumePreviewProps) {
  const isPreviewMode = mode === 'preview';

  if (isPreviewMode) {
    return (
      <div className='mx-auto w-full max-w-[210mm] print:w-[210mm] print:max-w-none'>
        <ResumePreviewDocument
          title={title}
          content={content}
          settings={settings}
          className='h-full print:rounded-none print:shadow-none print:border-stone-200'
        />
      </div>
    );
  }

  const pages = paginateResumeContent(content, settings);

  return (
    <div className='space-y-3'>
      {pages.map((pageContent, index) => (
        <div
          key={`resume-page-${index + 1}`}
          className='w-full'
          style={{
            minHeight: `${PREVIEW_PAGE_BASE_HEIGHT}px`,
          }}
        >
          <ResumePreviewDocument
            title={title}
            content={pageContent}
            settings={settings}
            className='h-full'
          />
        </div>
      ))}
    </div>
  );
}
