import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsSupabaseConfigured = vi.fn();
const mockIsDatabaseConfigured = vi.fn();
const mockIsSupabaseAdminConfigured = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockCreateSupabaseAdminClient = vi.fn();
const mockDeleteUserData = vi.fn();
const mockAuditLog = vi.fn();
const mockAdminDeleteUser = vi.fn();
const mockSignOut = vi.fn();

async function loadRouteModule() {
  vi.resetModules();

  vi.doMock('@/lib/supabase/env', () => ({
    isSupabaseConfigured: mockIsSupabaseConfigured,
  }));
  vi.doMock('@/lib/db/env', () => ({
    isDatabaseConfigured: mockIsDatabaseConfigured,
  }));
  vi.doMock('@/lib/supabase/admin', () => ({
    isSupabaseAdminConfigured: mockIsSupabaseAdminConfigured,
    createSupabaseAdminClient: mockCreateSupabaseAdminClient,
  }));
  vi.doMock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: mockCreateServerSupabaseClient,
  }));
  vi.doMock('@/lib/db/kvkk', () => ({
    deleteUserData: mockDeleteUserData,
  }));
  vi.doMock('@/lib/logging/logger', () => ({
    logger: {
      audit: mockAuditLog,
    },
  }));

  return import('./route');
}

describe('DELETE /api/user/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockIsDatabaseConfigured.mockReturnValue(true);
    mockIsSupabaseAdminConfigured.mockReturnValue(true);
    mockDeleteUserData.mockResolvedValue({
      requestLogCount: 3,
      resumeCount: 2,
      profileCount: 1,
      auditLogCount: 0,
      authEventCount: 0,
      activityLogsDeleted: false,
    });
    mockAuditLog.mockResolvedValue(undefined);
    mockAdminDeleteUser.mockResolvedValue({
      error: null,
    });
    mockSignOut.mockResolvedValue({
      error: null,
    });
    mockCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          deleteUser: mockAdminDeleteUser,
        },
      },
    });
    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
            },
          },
        }),
        signOut: mockSignOut,
      },
    });
  });

  it('varsayilan davranista hesap kaydini siler', async () => {
    const { DELETE } = await loadRouteModule();

    const response = await DELETE(
      new Request('http://localhost/api/user/delete-account', {
        method: 'DELETE',
      }) as NextRequest
    );

    const payload = (await response.json()) as {
      ok?: boolean;
      deletionSummary?: {
        activityLogsDeleted?: boolean;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.deletionSummary?.activityLogsDeleted).toBe(false);
    expect(mockDeleteUserData).toHaveBeenCalledWith('user-1', {
      deleteActivityLogs: false,
    });
    expect(mockAdminDeleteUser).toHaveBeenCalledWith('user-1');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('deleteActivityLogs=true ile log silme secenegini iletir', async () => {
    const { DELETE } = await loadRouteModule();

    const response = await DELETE(
      new Request(
        'http://localhost/api/user/delete-account?deleteActivityLogs=true',
        {
          method: 'DELETE',
        }
      ) as NextRequest
    );

    expect(response.status).toBe(200);
    expect(mockDeleteUserData).toHaveBeenCalledWith('user-1', {
      deleteActivityLogs: true,
    });
  });

  it('admin istemcisi eksikse 503 dondurur', async () => {
    mockIsSupabaseAdminConfigured.mockReturnValue(false);

    const { DELETE } = await loadRouteModule();
    const response = await DELETE(
      new Request('http://localhost/api/user/delete-account', {
        method: 'DELETE',
      }) as NextRequest
    );

    expect(response.status).toBe(503);
    expect(mockDeleteUserData).not.toHaveBeenCalled();
  });

  it('yetkisiz istekte admin ayari eksik olsa da 401 dondurur', async () => {
    mockIsSupabaseAdminConfigured.mockReturnValue(false);
    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
        }),
        signOut: mockSignOut,
      },
    });

    const { DELETE } = await loadRouteModule();
    const response = await DELETE(
      new Request('http://localhost/api/user/delete-account', {
        method: 'DELETE',
      }) as NextRequest
    );

    expect(response.status).toBe(401);
    expect(mockDeleteUserData).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });
});
