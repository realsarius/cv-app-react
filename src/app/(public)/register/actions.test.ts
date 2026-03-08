import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});
const mockHeaders = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockExtractClientIp = vi.fn();

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
      get: vi.fn().mockReturnValue('203.0.113.20'),
    });
    mockExtractClientIp.mockReturnValue('203.0.113.20');
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      limit: 4,
      remaining: 3,
      resetAt: Date.now() + 1000,
      retryAfterSec: 1,
    });

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          error: null,
        }),
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

    await expect(
      registerAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow(
      'REDIRECT:/register?error=Cok+fazla+kayit+denemesi+algilandi.+Lutfen+daha+sonra+tekrar+deneyin'
    );
  });

  it('basarili kayitta dashboarda yonlendirir', async () => {
    const { registerAction } = await loadActionModule();

    await expect(
      registerAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow('REDIRECT:/dashboard');

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'auth-register',
      })
    );
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
      'REDIRECT:/register?error=User%20already%20registered'
    );
  });
});
