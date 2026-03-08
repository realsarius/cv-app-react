import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateServerSupabaseClient = vi.fn();
const mockIsSupabaseConfigured = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockVerifyOtp = vi.fn();

async function loadRouteModule() {
  vi.resetModules();

  vi.doMock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: mockCreateServerSupabaseClient,
  }));
  vi.doMock('@/lib/supabase/env', () => ({
    isSupabaseConfigured: mockIsSupabaseConfigured,
  }));

  return import('./route');
}

function buildRequest(pathnameAndQuery: string, headers?: HeadersInit) {
  return new Request(`http://localhost${pathnameAndQuery}`, {
    headers,
  }) as NextRequest;
}

function getRedirectUrl(response: Response) {
  const location = response.headers.get('location');

  if (!location) {
    throw new Error('location header bekleniyordu');
  }

  return new URL(location, 'http://localhost');
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsSupabaseConfigured.mockReturnValue(true);
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
    });
    mockVerifyOtp.mockResolvedValue({
      error: null,
    });

    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        verifyOtp: mockVerifyOtp,
      },
    });
  });

  it('code parametresi geldiginde session degisimi yapip hedefe yonlendirir', async () => {
    const { GET } = await loadRouteModule();

    const response = await GET(
      buildRequest('/auth/callback?code=test-code&next=/dashboard')
    );
    const redirectUrl = getRedirectUrl(response);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code');
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(redirectUrl.pathname).toBe('/dashboard');
  });

  it('token_hash ile otp dogrulamasini calistirir', async () => {
    const { GET } = await loadRouteModule();

    const response = await GET(
      buildRequest('/auth/callback?token_hash=token-hash-1&type=signup&next=/resumes')
    );
    const redirectUrl = getRedirectUrl(response);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: 'signup',
      token_hash: 'token-hash-1',
    });
    expect(redirectUrl.pathname).toBe('/resumes');
  });

  it('gecersiz next parametresinde dashboarda guvenli fallback uygular', async () => {
    const { GET } = await loadRouteModule();

    const response = await GET(
      buildRequest('/auth/callback?code=test-code&next=https://evil.example')
    );
    const redirectUrl = getRedirectUrl(response);

    expect(redirectUrl.pathname).toBe('/dashboard');
  });

  it('supabase islem hatasinda login sayfasina hata mesajiyla doner', async () => {
    const { GET } = await loadRouteModule();

    mockExchangeCodeForSession.mockResolvedValue({
      error: {
        message: 'Invalid grant',
      },
    });

    const response = await GET(buildRequest('/auth/callback?code=broken'));
    const redirectUrl = getRedirectUrl(response);

    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('error')).toBe('Invalid grant');
  });

  it('accept-language en oldugunda gecersiz link hatasini ingilizce dondurur', async () => {
    const { GET } = await loadRouteModule();

    const response = await GET(
      buildRequest('/auth/callback', {
        'accept-language': 'en-US,en;q=0.9',
      })
    );
    const redirectUrl = getRedirectUrl(response);

    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('error')).toBe('Verification link is invalid or expired.');
  });
});
