import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetResumeEditorState = vi.fn();
const mockCreateResumePdf = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockIsDatabaseConfigured = vi.fn();

async function loadRouteModule() {
  vi.resetModules();

  vi.doMock('@/lib/db/resume-editor', () => ({
    getResumeEditorState: mockGetResumeEditorState,
  }));
  vi.doMock('@/lib/pdf/resume-export', () => ({
    createResumePdf: mockCreateResumePdf,
  }));
  vi.doMock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: mockCreateServerSupabaseClient,
  }));
  vi.doMock('@/lib/supabase/env', () => ({
    isSupabaseConfigured: mockIsSupabaseConfigured,
  }));
  vi.doMock('@/lib/db/env', () => ({
    isDatabaseConfigured: mockIsDatabaseConfigured,
  }));

  return import('./route');
}

describe('GET /api/resumes/[resumeId]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockIsDatabaseConfigured.mockReturnValue(true);
  });

  it('yetkisiz istekte 401 dondurur', async () => {
    const { GET } = await loadRouteModule();

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
        }),
      },
    });

    const response = await GET(new Request('http://localhost') , {
      params: {
        resumeId: '550e8400-e29b-41d4-a716-446655440000',
      },
    });

    expect(response.status).toBe(401);
    expect(mockGetResumeEditorState).not.toHaveBeenCalled();
  });

  it('basarili exportta pdf ve dosya basligi dondurur', async () => {
    const { GET } = await loadRouteModule();

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
            },
          },
        }),
      },
    });

    mockGetResumeEditorState.mockResolvedValue({
      resume: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Senior Frontend CV 2026',
      },
      content: {
        personalDetails: {
          fullName: 'Ali Veli',
          jobTitle: 'Frontend Developer',
          email: 'ali@example.com',
          phone: '',
          address: '',
        },
        profile: '',
        experiences: [],
        educations: [],
        projects: [],
      },
      settings: {
        templateKey: 'ats-classic',
        fontScale: 1,
        spacingScale: 1,
        colorScheme: 'neutral',
        updatedAt: new Date('2026-03-08T12:00:00.000Z'),
      },
    });

    mockCreateResumePdf.mockResolvedValue(new Uint8Array(Buffer.from('%PDF-1.7')));

    const response = await GET(new Request('http://localhost'), {
      params: {
        resumeId: '550e8400-e29b-41d4-a716-446655440000',
      },
    });

    const bytes = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="senior-frontend-cv-2026-ats.pdf"'
    );
    expect(bytes.toString('utf-8')).toBe('%PDF-1.7');
  });
});
