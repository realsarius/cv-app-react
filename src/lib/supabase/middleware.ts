import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const PUBLIC_PATHS = ['/login', '/register'];
const PROTECTED_PREFIXES = ['/dashboard', '/resumes', '/settings'];

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function normalizePathname(pathname: string) {
  const segments = pathname.split('/');
  const maybeLocale = segments[1];

  if (routing.locales.includes(maybeLocale as 'tr' | 'en')) {
    const localizedPath = `/${segments.slice(2).join('/')}`;
    return localizedPath === '/' ? '/' : localizedPath.replace(/\/+$/, '') || '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

function resolveRequestLocale(pathname: string) {
  const maybeLocale = pathname.split('/')[1];
  if (routing.locales.includes(maybeLocale as 'tr' | 'en')) {
    return maybeLocale as (typeof routing.locales)[number];
  }

  return null;
}

function buildLocalizedPath(path: string, locale: (typeof routing.locales)[number]) {
  if (locale === routing.defaultLocale) {
    return path;
  }

  return `${`/${locale}`}${path === '/' ? '' : path}`;
}

export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!hasSupabaseEnv()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const localeFromPath = resolveRequestLocale(pathname);
  const localeFromCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const locale =
    localeFromPath ||
    (routing.locales.includes(localeFromCookie as 'tr' | 'en')
      ? (localeFromCookie as (typeof routing.locales)[number])
      : routing.defaultLocale);
  const normalizedPath = normalizePathname(pathname);
  const isPublicPath = PUBLIC_PATHS.includes(normalizedPath);
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    normalizedPath.startsWith(prefix)
  );

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = buildLocalizedPath('/login', locale);
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = buildLocalizedPath('/dashboard', locale);
    return NextResponse.redirect(url);
  }

  return response;
}
