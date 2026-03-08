import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSaveResumeEditorState = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockIsDatabaseConfigured = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockBuildRateLimitHeaders = vi.fn();
const mockExtractClientIp = vi.fn();

function buildRequestBody() {
  return {
    title: 'Frontend Developer CV',
    expectedUpdatedAt: '2026-03-08T10:00:00.000Z',
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
  };
}

async function loadRouteModule() {
  vi.resetModules();

  vi.doMock('@/lib/db/resume-editor', () => ({
    saveResumeEditorState: mockSaveResumeEditorState,
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
  vi.doMock('@/lib/security/rate-limit', () => ({
    checkRateLimit: mockCheckRateLimit,
    buildRateLimitHeaders: mockBuildRateLimitHeaders,
    extractClientIp: mockExtractClientIp,
  }));

  return import('./route');
}

describe('POST /api/resumes/[resumeId]/autosave', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockIsDatabaseConfigured.mockReturnValue(true);
    mockExtractClientIp.mockReturnValue('203.0.113.50');
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      limit: 45,
      remaining: 44,
      resetAt: 1_700_000_000_000,
      retryAfterSec: 60,
    });
    mockBuildRateLimitHeaders.mockImplementation(
      (result, includeRetryAfter = true) => ({
        'x-ratelimit-limit': String(result.limit),
        'x-ratelimit-remaining': String(result.remaining),
        ...(includeRetryAfter
          ? { 'retry-after': String(result.retryAfterSec) }
          : {}),
      })
    );

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

  it('yazma cakismasinda 409 write_conflict dondurur', async () => {
    const { POST } = await loadRouteModule();

    mockSaveResumeEditorState.mockResolvedValue({
      status: 'conflict',
      currentVersionNo: 8,
      currentUpdatedAt: new Date('2026-03-08T10:02:00.000Z'),
    });

    const response = await POST(
      new Request('http://localhost/api/resumes/1/autosave', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildRequestBody()),
      }) as NextRequest,
      {
        params: {
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
        },
      }
    );

    const payload = (await response.json()) as {
      code?: string;
      currentVersionNo?: number;
      currentUpdatedAt?: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe('write_conflict');
    expect(payload.currentVersionNo).toBe(8);
    expect(payload.currentUpdatedAt).toBe('2026-03-08T10:02:00.000Z');
    expect(mockSaveResumeEditorState).toHaveBeenCalledWith(
      'user-1',
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({
        expectedUpdatedAt: expect.any(Date),
      })
    );
  });

  it('rate limit asiminda 429 dondurur', async () => {
    const { POST } = await loadRouteModule();

    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      limit: 45,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      retryAfterSec: 20,
    });

    const response = await POST(
      new Request('http://localhost/api/resumes/1/autosave', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildRequestBody()),
      }) as NextRequest,
      {
        params: {
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
        },
      }
    );

    expect(response.status).toBe(429);
    expect(mockSaveResumeEditorState).not.toHaveBeenCalled();
  });

  it('kayit basariliysa 200 ve updatedAt dondurur', async () => {
    const { POST } = await loadRouteModule();

    mockSaveResumeEditorState.mockResolvedValue({
      status: 'saved',
      resume: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Frontend Developer CV',
        currentVersionNo: 9,
        updatedAt: new Date('2026-03-08T10:03:00.000Z'),
      },
    });

    const response = await POST(
      new Request('http://localhost/api/resumes/1/autosave', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildRequestBody()),
      }) as NextRequest,
      {
        params: {
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
        },
      }
    );

    const payload = (await response.json()) as {
      ok?: boolean;
      currentVersionNo?: number;
      updatedAt?: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.currentVersionNo).toBe(9);
    expect(payload.updatedAt).toBe('2026-03-08T10:03:00.000Z');
    expect(response.headers.get('x-ratelimit-limit')).toBe('45');
  });
});
