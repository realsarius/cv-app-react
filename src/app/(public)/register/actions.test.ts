import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});
const mockHeaders = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockExtractClientIp = vi.fn();
const mockSignUp = vi.fn();

function buildFormData(email?: string, password?: string) {
  const formData = new FormData();
  if (typeof email === 'string') {
    formData.set('email', email);
  }
  if (typeof password === 'string') {
    formData.set('password', password);
  }

  return formData;
}

async function loadActionModule() {
  vi.resetModules();

  vi.doMock('next/navigation', () => ({
    redirect: mockRedirect,
  }));
  vi.doMock('next/headers', () => ({
    headers: mockHeaders,
  }));
  vi.doMock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: mockCreateServerSupabaseClient,
  }));
  vi.doMock('@/lib/supabase/env', () => ({
    isSupabaseConfigured: mockIsSupabaseConfigured,
  }));
  vi.doMock('@/lib/security/rate-limit', () => ({
    checkRateLimit: mockCheckRateLimit,
    extractClientIp: mockExtractClientIp,
  }));

  return import('./actions');
}

describe('registerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockHeaders.mockResolvedValue({
      get: vi.fn((name: string) => {
        const headerMap: Record<string, string | null> = {
          origin: 'http://localhost:3010',
          host: 'localhost:3010',
          'x-forwarded-for': '203.0.113.20',
        };

        return headerMap[name] ?? null;
      }),
    });
    mockExtractClientIp.mockReturnValue('203.0.113.20');
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      limit: 4,
      remaining: 3,
      resetAt: Date.now() + 1000,
      retryAfterSec: 1,
    });

    mockSignUp.mockResolvedValue({
      error: null,
    });

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        signUp: mockSignUp,
      },
    });
  });

  it('rate limit asiminda register hata sayfasina yonlendirir', async () => {
    const { registerAction } = await loadActionModule();

    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      limit: 4,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSec: 60,
    });

    const expectedQuery = new URLSearchParams({
      error: 'Çok fazla kayıt denemesi algılandı. Lütfen daha sonra tekrar deneyin',
    }).toString();

    await expect(
      registerAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow(
      `REDIRECT:/register?${expectedQuery}`
    );
  });

  it('basarili kayitta check-email sayfasina yonlendirir', async () => {
    const { registerAction } = await loadActionModule();

    await expect(
      registerAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow('REDIRECT:/register/check-email?email=ali%40example.com');

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'auth-register',
      })
    );
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'ali@example.com',
      password: 'password123',
      options: {
        emailRedirectTo: 'http://localhost:3010/auth/callback?next=%2Fdashboard',
      },
    });
  });

  it('supabase signUp hatasinda register sayfasina hata mesajiyla doner', async () => {
    const { registerAction } = await loadActionModule();

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          error: {
            message: 'User already registered',
          },
        }),
      },
    });

    await expect(
      registerAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow(
      `REDIRECT:/register?${new URLSearchParams({
        error: 'User already registered',
      }).toString()}`
    );
  });
});
