import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpsertResumeSettings = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockIsDatabaseConfigured = vi.fn();

function validBody() {
  return {
    templateKey: 'ats-classic',
    fontScale: 1,
    spacingScale: 1,
    colorScheme: 'neutral',
  };
}

async function loadRouteModule() {
  vi.resetModules();

  vi.doMock('@/lib/db/resume-settings', () => ({
    upsertResumeSettings: mockUpsertResumeSettings,
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

describe('POST /api/resumes/[resumeId]/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockIsDatabaseConfigured.mockReturnValue(true);

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
  });

  it('gecersiz ayar payloadinda 400 dondurur', async () => {
    const { POST } = await loadRouteModule();

    const response = await POST(
      new Request('http://localhost/api/resumes/1/settings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...validBody(),
          fontScale: 9,
        }),
      }) as NextRequest,
      {
        params: {
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
        },
      }
    );

    expect(response.status).toBe(400);
    expect(mockUpsertResumeSettings).not.toHaveBeenCalled();
  });

  it('basarili kayitta ayarlari ve iso updatedAt degerini dondurur', async () => {
    const { POST } = await loadRouteModule();

    mockUpsertResumeSettings.mockResolvedValue({
      templateKey: 'ats-compact',
      fontScale: 1.1,
      spacingScale: 0.95,
      colorScheme: 'slate',
      updatedAt: new Date('2026-03-08T11:05:00.000Z'),
    });

    const response = await POST(
      new Request('http://localhost/api/resumes/1/settings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          templateKey: 'ats-compact',
          fontScale: 1.1,
          spacingScale: 0.95,
          colorScheme: 'slate',
        }),
      }) as NextRequest,
      {
        params: {
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
        },
      }
    );

    const payload = (await response.json()) as {
      ok?: boolean;
      settings?: {
        templateKey?: string;
        updatedAt?: string;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.settings?.templateKey).toBe('ats-compact');
    expect(payload.settings?.updatedAt).toBe('2026-03-08T11:05:00.000Z');
    expect(mockUpsertResumeSettings).toHaveBeenCalledWith(
      'user-1',
      '550e8400-e29b-41d4-a716-446655440000',
      {
        templateKey: 'ats-compact',
        fontScale: 1.1,
        spacingScale: 0.95,
        colorScheme: 'slate',
      }
    );
  });
});
