import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.fn(
  (target: string | { href: string; locale?: string }) => {
    const href = typeof target === 'string' ? target : target.href;
    throw new Error(`REDIRECT:${href}`);
  }
);
const mockHeaders = vi.fn();
const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockExtractClientIp = vi.fn();
const mockGetLocale = vi.fn();
const mockGetTranslations = vi.fn();

const translationMap = {
  common: {
    supabaseEnvMissing: 'Supabase ortam değişkenleri eksik.',
  },
  'auth.errors': {
    invalidLoginCredentials: 'Giriş bilgileri geçersiz.',
    loginRateLimited: 'Çok fazla giriş denemesi algılandı. Lütfen biraz sonra tekrar deneyin.',
    emailNotConfirmed: 'E-posta adresi doğrulanmadı. Lütfen e-posta kutunuzu kontrol edin.',
  },
} as const;

function createTranslator(
  namespace: keyof typeof translationMap
): (key: string) => string {
  return (key: string) => {
    const value = translationMap[namespace][key as keyof (typeof translationMap)[typeof namespace]];
    if (typeof value !== 'string') {
      throw new Error(`Missing translation key: ${namespace}.${key}`);
    }

    return value;
  };
}

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

  vi.doMock('@/i18n/navigation', () => ({
    redirect: mockRedirect,
  }));
  vi.doMock('next-intl/server', () => ({
    getLocale: mockGetLocale,
    getTranslations: mockGetTranslations,
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
    mockGetLocale.mockResolvedValue('tr');
    mockGetTranslations.mockImplementation((namespace: keyof typeof translationMap) =>
      Promise.resolve(createTranslator(namespace))
    );
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

  it('en locale ile basarili giriste locale korunarak dashboarda yonlendirir', async () => {
    const { loginAction } = await loadActionModule();

    mockGetLocale.mockResolvedValue('en');

    await expect(
      loginAction(buildFormData('ali@example.com', 'password123'))
    ).rejects.toThrow('REDIRECT:/dashboard');

    expect(mockRedirect).toHaveBeenLastCalledWith({
      href: '/dashboard',
      locale: 'en',
    });
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
