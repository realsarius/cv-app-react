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
const mockSignUp = vi.fn();
const mockGetLocale = vi.fn();
const mockGetPathname = vi.fn();
const mockGetTranslations = vi.fn();

const translationMap = {
  common: {
    supabaseEnvMissing: 'Supabase ortam değişkenleri eksik.',
  },
  'auth.errors': {
    registerInvalidInput: 'Kayıt bilgileri geçersiz.',
    registerRateLimited: 'Çok fazla kayıt denemesi algılandı. Lütfen daha sonra tekrar deneyin.',
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
    getPathname: mockGetPathname,
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
    mockGetLocale.mockResolvedValue('tr');
    mockGetTranslations.mockImplementation((namespace: keyof typeof translationMap) =>
      Promise.resolve(createTranslator(namespace))
    );
    mockGetPathname.mockReturnValue('/dashboard');
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
