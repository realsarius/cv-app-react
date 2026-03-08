import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './middleware';

const { mockGetUser, mockCreateServerClient } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateServerClient: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function buildRequest(pathname: string, cookieHeader?: string) {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: cookieHeader
      ? {
          cookie: cookieHeader,
        }
      : undefined,
  });
}

describe('updateSession locale redirect behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockGetUser.mockResolvedValue({
      data: {
        user: null,
      },
    });
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
  });

  it('guest kullanıcı /en/dashboard isteğinde /en/login sayfasına yönlendirilir', async () => {
    const response = await updateSession(
      buildRequest('/en/dashboard'),
      NextResponse.next()
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/en/login');
  });

  it('guest kullanıcı /dashboard isteğinde varsayılan locale ile /login sayfasına yönlendirilir', async () => {
    const response = await updateSession(
      buildRequest('/dashboard'),
      NextResponse.next()
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('giriş yapmış kullanıcı /en/login isteğinde /en/dashboard sayfasına yönlendirilir', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
    });

    const response = await updateSession(
      buildRequest('/en/login'),
      NextResponse.next()
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/en/dashboard');
  });

  it('giriş yapmış kullanıcı /login isteğinde NEXT_LOCALE=en cookie ile /en/dashboard sayfasına yönlendirilir', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-2',
        },
      },
    });

    const response = await updateSession(
      buildRequest('/login', 'NEXT_LOCALE=en'),
      NextResponse.next()
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/en/dashboard');
  });
});
