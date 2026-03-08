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

describe('loginAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockHeaders.mockResolvedValue({
      get: vi.fn().mockReturnValue('203.0.113.10'),
    });
    mockExtractClientIp.mockReturnValue('203.0.113.10');
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      limit: 6,
      remaining: 5,
      resetAt: Date.now() + 1000,
      retryAfterSec: 1,
    });

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: null,
        }),
      },
    });
  });

  it('rate limit asiminda login hata sayfasina yonlendirir', async () => {
    const { loginAction } = await loadActionModule();

    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      limit: 6,
      remaining: 0,
      resetAt: Date.now() + 30_000,
      retryAfterSec: 30,
    });

    const expectedQuery = new URLSearchParams({
      error: 'Çok fazla giriş denemesi algılandı. Lütfen biraz sonra tekrar deneyin',
    }).toString();

    await expect(
      loginAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow(
      `REDIRECT:/login?${expectedQuery}`
    );
  });

  it('basarili giriste dashboarda yonlendirir', async () => {
    const { loginAction } = await loadActionModule();

    await expect(
      loginAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow('REDIRECT:/dashboard');

    expect(mockCreateServerSupabaseClient).toHaveBeenCalledTimes(1);
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'auth-login',
      })
    );
  });

  it('supabase auth hatasinda login sayfasina hata mesajiyla doner', async () => {
    const { loginAction } = await loadActionModule();

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: {
            message: 'Invalid login credentials',
          },
        }),
      },
    });

    await expect(
      loginAction(buildFormData('ali@example.com', 'wrong-password'))
    ).rejects.toThrow(
      `REDIRECT:/login?${new URLSearchParams({
        error: 'Invalid login credentials',
      }).toString()}`
    );
  });

  it('email dogrulanmadi hatasinda kullanici dostu mesaja donusturur', async () => {
    const { loginAction } = await loadActionModule();

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: {
            message: 'Email not confirmed',
          },
        }),
      },
    });

    await expect(
      loginAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow(
      `REDIRECT:/login?${new URLSearchParams({
        error: 'E-posta adresi doğrulanmadı. Lütfen e-posta kutunuzu kontrol edin.',
      }).toString()}`
    );
  });
});
