import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCalculateAtsScore = vi.fn();
const mockSaveJobTargetAnalysis = vi.fn();
const mockTrimJobTargetHistory = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockIsDatabaseConfigured = vi.fn();

function buildRequest() {
  return new Request('http://localhost/api/ats/score', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.42, 10.1.1.1',
    },
    body: JSON.stringify({
      jobDescription:
        'We are looking for a frontend engineer with react next.js typescript performance and testing skills in modern web apps.',
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
    }),
  }) as NextRequest;
}

async function loadRouteModule() {
  vi.resetModules();

  vi.doMock('@/lib/ats/scoring', () => ({
    calculateAtsScore: mockCalculateAtsScore,
  }));
  vi.doMock('@/lib/db/job-targets', () => ({
    saveJobTargetAnalysis: mockSaveJobTargetAnalysis,
    trimJobTargetHistory: mockTrimJobTargetHistory,
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

  const routeModule = await import('./route');
  const securityModule = await import('@/lib/security/rate-limit');

  return {
    ...routeModule,
    resetRateLimitStore: securityModule.__resetRateLimitStoreForTests,
  };
}

describe('POST /api/ats/score', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockIsDatabaseConfigured.mockReturnValue(false);

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-ats-1',
            },
          },
        }),
      },
    });

    mockCalculateAtsScore.mockReturnValue({
      overallScore: 78,
      matchedKeywords: ['react', 'next.js'],
      missingKeywords: ['playwright'],
      suggestions: ['Test coverage artirilabilir'],
      algorithmVersion: 'v1.0-rule-based',
      breakdown: {
        keywordCoverage: 36,
        sectionCompleteness: 22,
        readability: 12,
        roleAlignment: 8,
      },
    });
  });

  it('basarili istekte ratelimit basliklari ile 200 dondurur', async () => {
    const { POST, resetRateLimitStore } = await loadRouteModule();
    resetRateLimitStore();

    const response = await POST(buildRequest());
    const payload = (await response.json()) as { overallScore?: number };

    expect(response.status).toBe(200);
    expect(payload.overallScore).toBe(78);
    expect(response.headers.get('x-ratelimit-limit')).toBe('20');
    expect(response.headers.get('x-ratelimit-remaining')).toBe('19');
    expect(response.headers.get('retry-after')).toBeNull();
  });

  it('limit asiminda 429 ve retry-after dondurur', async () => {
    const { POST, resetRateLimitStore } = await loadRouteModule();
    resetRateLimitStore();

    for (let index = 0; index < 20; index += 1) {
      const okResponse = await POST(buildRequest());
      expect(okResponse.status).toBe(200);
    }

    const blockedResponse = await POST(buildRequest());
    const payload = (await blockedResponse.json()) as { error?: string };

    expect(blockedResponse.status).toBe(429);
    expect(payload.error).toContain('Cok fazla ATS analizi');
    expect(blockedResponse.headers.get('retry-after')).not.toBeNull();
    expect(blockedResponse.headers.get('x-ratelimit-remaining')).toBe('0');
  });
});
