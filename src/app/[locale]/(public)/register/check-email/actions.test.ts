import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.fn(
  (target: string | { href: string; locale?: string }) => {
    const href = typeof target === 'string' ? target : target.href;
    throw new Error(`REDIRECT:${href}`);
  }
);
const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockVerifyOtp = vi.fn();
const mockGetLocale = vi.fn();
const mockGetTranslations = vi.fn();

const translationMap = {
  common: {
    supabaseEnvMissing: 'Supabase ortam değişkenleri eksik.',
  },
  'auth.errors': {
    verificationCodeRequired: 'E-posta ve doğrulama kodu zorunludur.',
    verificationCodeInvalidOrExpired: 'Doğrulama kodu geçersiz veya süresi dolmuş.',
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

function buildFormData(email?: string, code?: string) {
  const formData = new FormData();

  if (typeof email === 'string') {
    formData.set('email', email);
  }

  if (typeof code === 'string') {
    formData.set('code', code);
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
  vi.doMock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: mockCreateServerSupabaseClient,
  }));
  vi.doMock('@/lib/supabase/env', () => ({
    isSupabaseConfigured: mockIsSupabaseConfigured,
  }));

  return import('./actions');
}

describe('verifyEmailCodeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockGetLocale.mockResolvedValue('tr');
    mockGetTranslations.mockImplementation((namespace: keyof typeof translationMap) =>
      Promise.resolve(createTranslator(namespace))
    );
    mockVerifyOtp.mockResolvedValue({
      error: null,
    });

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        verifyOtp: mockVerifyOtp,
      },
    });
  });

  it('email veya kod bos ise check-email sayfasina hatayla yonlendirir', async () => {
    const { verifyEmailCodeAction } = await loadActionModule();

    const expectedQuery = new URLSearchParams({
      email: 'ali@example.com',
      error: 'E-posta ve doğrulama kodu zorunludur.',
    }).toString();

    await expect(verifyEmailCodeAction(buildFormData('ali@example.com'))).rejects.toThrow(
      `REDIRECT:/register/check-email?${expectedQuery}`
    );
  });

  it('otp dogrulama hatasinda check-email sayfasina yonlendirir', async () => {
    const { verifyEmailCodeAction } = await loadActionModule();

    mockVerifyOtp.mockResolvedValue({
      error: {
        message: 'Token expired',
      },
    });

    const expectedQuery = new URLSearchParams({
      email: 'ali@example.com',
      error: 'Doğrulama kodu geçersiz veya süresi dolmuş.',
    }).toString();

    await expect(
      verifyEmailCodeAction(buildFormData('ali@example.com', '469740'))
    ).rejects.toThrow(
      `REDIRECT:/register/check-email?${expectedQuery}`
    );
  });

  it('otp dogrulama basarili oldugunda dashboarda yonlendirir', async () => {
    const { verifyEmailCodeAction } = await loadActionModule();

    await expect(
      verifyEmailCodeAction(buildFormData('ali@example.com', '469740'))
    ).rejects.toThrow('REDIRECT:/dashboard');

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'ali@example.com',
      token: '469740',
      type: 'signup',
    });
  });

  it('signup tipi hataliysa email tipi ile fallback dogrulamasi yapar', async () => {
    const { verifyEmailCodeAction } = await loadActionModule();

    mockVerifyOtp
      .mockResolvedValueOnce({
        error: {
          message: 'Invalid token',
        },
      })
      .mockResolvedValueOnce({
        error: null,
      });

    await expect(
      verifyEmailCodeAction(buildFormData('ali@example.com', '94843772'))
    ).rejects.toThrow('REDIRECT:/dashboard');

    expect(mockVerifyOtp).toHaveBeenNthCalledWith(1, {
      email: 'ali@example.com',
      token: '94843772',
      type: 'signup',
    });
    expect(mockVerifyOtp).toHaveBeenNthCalledWith(2, {
      email: 'ali@example.com',
      token: '94843772',
      type: 'email',
    });
  });
});
