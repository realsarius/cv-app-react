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
  const pages = paginateResumeContent(content, settings);
  const isPreviewMode = mode === 'preview';

  return (
    <div className={isPreviewMode ? 'space-y-5 print:space-y-0' : 'space-y-3'}>
      {pages.map((pageContent, index) => (
        <div
          key={`resume-page-${index + 1}`}
          className={
            isPreviewMode
              ? 'mx-auto w-full max-w-[210mm] print:w-[210mm] print:max-w-none print:break-after-page last:print:break-after-auto'
              : 'w-full'
          }
          style={{
            minHeight: isPreviewMode ? '297mm' : `${PREVIEW_PAGE_BASE_HEIGHT}px`,
          }}
        >
          <ResumePreviewDocument
            title={title}
            content={pageContent}
            settings={settings}
            className={
              isPreviewMode
                ? 'h-full print:rounded-none print:shadow-none print:border-stone-200'
                : 'h-full'
            }
          />
        </div>
      ))}
    </div>
  );
}
