import createMiddleware from 'next-intl/middleware';
import { type NextFetchEvent, type NextRequest, type NextResponse } from 'next/server';
import { LOGGING_ENABLED } from '@/config/logging';
import { routing } from '@/i18n/routing';
import { shouldLogRequest } from '@/lib/logging/sampling';
import { getClientInfo, generateTraceId, normalizePath } from '@/lib/logging/trace';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

type RequestLogPayload = {
  type: 'request';
  traceId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
  locale: string | null;
};

function sendRequestLog(origin: string, payload: RequestLogPayload) {
  if (!LOGGING_ENABLED) {
    return Promise.resolve();
  }

  const internalSecret = process.env.INTERNAL_LOG_SECRET;
  if (!internalSecret) {
    return Promise.resolve();
  }

  return fetch(`${origin}/api/internal/log`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  }).catch(() => {
    return undefined;
  });
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const pathname = normalizePath(request.nextUrl.pathname);
  const clientInfo = getClientInfo(request.headers, pathname);

  const intlResponse = intlMiddleware(request);
  let response: NextResponse;

  if (intlResponse.headers.get('location')) {
    response = intlResponse;
  } else {
    response = await updateSession(request, intlResponse, traceId);
  }

  response.headers.set('x-trace-id', traceId);

  const durationMs = Date.now() - startTime;
  if (
    LOGGING_ENABLED &&
    shouldLogRequest({
      traceId,
      path: pathname,
      statusCode: response.status,
      durationMs,
    })
  ) {
    const payload: RequestLogPayload = {
      type: 'request',
      traceId,
      method: request.method,
      path: pathname,
      statusCode: response.status,
      durationMs,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      locale: clientInfo.locale,
    };

    event.waitUntil(sendRequestLog(request.nextUrl.origin, payload));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
