import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsSupabaseConfigured = vi.fn();
const mockIsDatabaseConfigured = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockGetUserDataExport = vi.fn();
const mockAuditLog = vi.fn();

async function loadRouteModule() {
  vi.resetModules();

  vi.doMock('@/lib/supabase/env', () => ({
    isSupabaseConfigured: mockIsSupabaseConfigured,
  }));
  vi.doMock('@/lib/db/env', () => ({
    isDatabaseConfigured: mockIsDatabaseConfigured,
  }));
  vi.doMock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: mockCreateServerSupabaseClient,
  }));
  vi.doMock('@/lib/db/kvkk', () => ({
    getUserDataExport: mockGetUserDataExport,
  }));
  vi.doMock('@/lib/logging/logger', () => ({
    logger: {
      audit: mockAuditLog,
    },
  }));

  return import('./route');
}

describe('GET /api/user/data-export', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockIsDatabaseConfigured.mockReturnValue(true);
    mockGetUserDataExport.mockResolvedValue({
      profile: {
        id: 'user-1',
      },
      resumes: [],
      resumeVersions: [],
      resumeSettings: [],
      jobTargets: [],
      auditLogs: [],
      authEvents: [],
    });
    mockAuditLog.mockResolvedValue(undefined);

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

  it('yetkili kullanicida export verisini dondurur', async () => {
    const { GET } = await loadRouteModule();

    const response = await GET(
      new Request('http://localhost/api/user/data-export', {
        method: 'GET',
      }) as NextRequest
    );

    const payload = (await response.json()) as {
      exportedAt?: string;
      data?: {
        profile?: {
          id?: string;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data?.profile?.id).toBe('user-1');
    expect(payload.exportedAt).toBeTypeOf('string');
    expect(mockGetUserDataExport).toHaveBeenCalledWith('user-1');
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
  });

  it('yetkisiz istekte 401 dondurur', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
        }),
      },
    });

    const { GET } = await loadRouteModule();
    const response = await GET(
      new Request('http://localhost/api/user/data-export', {
        method: 'GET',
      }) as NextRequest
    );

    expect(response.status).toBe(401);
    expect(mockGetUserDataExport).not.toHaveBeenCalled();
  });
});

