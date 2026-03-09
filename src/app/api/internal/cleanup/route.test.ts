import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDb = vi.fn();
const mockWhereSelect = vi.fn();
const mockWhereDelete = vi.fn();
const mockSelect = vi.fn();
const mockDelete = vi.fn();

async function loadRouteModule() {
  vi.resetModules();

  vi.doMock('@/lib/db/client', () => ({
    getDb: mockGetDb,
  }));

  return import('./route');
}

describe('GET /api/internal/cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'secret-token';

    mockWhereSelect
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 1 }]);
    mockWhereDelete.mockResolvedValue(undefined);

    mockSelect.mockReturnValue({
      from: () => ({
        where: mockWhereSelect,
      }),
    });
    mockDelete.mockReturnValue({
      where: mockWhereDelete,
    });

    mockGetDb.mockReturnValue({
      select: mockSelect,
      delete: mockDelete,
    });
  });

  it('gecersiz secret ile 401 dondurur', async () => {
    const { GET } = await loadRouteModule();
    const response = await GET(
      new Request('http://localhost/api/internal/cleanup', {
        method: 'GET',
      }) as NextRequest
    );

    expect(response.status).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('dogru secret ile cleanup islemini calistirir', async () => {
    const { GET } = await loadRouteModule();
    const response = await GET(
      new Request('http://localhost/api/internal/cleanup', {
        method: 'GET',
        headers: {
          'x-cron-secret': 'secret-token',
        },
      }) as NextRequest
    );

    const payload = (await response.json()) as {
      ok?: boolean;
      requestLogsDeleted?: number;
      auditLogsDeleted?: number;
      authEventsDeleted?: number;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.requestLogsDeleted).toBe(3);
    expect(payload.auditLogsDeleted).toBe(2);
    expect(payload.authEventsDeleted).toBe(1);
    expect(mockDelete).toHaveBeenCalledTimes(3);
  });
});

