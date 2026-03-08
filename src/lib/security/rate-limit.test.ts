import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetRateLimitStoreForTests,
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
} from './rate-limit';

afterEach(() => {
  __resetRateLimitStoreForTests();
});

describe('checkRateLimit', () => {
  it('limit asildiginda istegi engeller', () => {
    const first = checkRateLimit({
      bucket: 'ats-score',
      identifier: 'user-1',
      limit: 2,
      windowMs: 60_000,
      nowMs: 1_000,
    });
    const second = checkRateLimit({
      bucket: 'ats-score',
      identifier: 'user-1',
      limit: 2,
      windowMs: 60_000,
      nowMs: 1_100,
    });
    const third = checkRateLimit({
      bucket: 'ats-score',
      identifier: 'user-1',
      limit: 2,
      windowMs: 60_000,
      nowMs: 1_200,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it('pencere suresi dolunca sayaci sifirlar', () => {
    checkRateLimit({
      bucket: 'auth-login',
      identifier: 'ip-1',
      limit: 1,
      windowMs: 10_000,
      nowMs: 5_000,
    });

    const blocked = checkRateLimit({
      bucket: 'auth-login',
      identifier: 'ip-1',
      limit: 1,
      windowMs: 10_000,
      nowMs: 6_000,
    });

    const allowedAgain = checkRateLimit({
      bucket: 'auth-login',
      identifier: 'ip-1',
      limit: 1,
      windowMs: 10_000,
      nowMs: 15_001,
    });

    expect(blocked.allowed).toBe(false);
    expect(allowedAgain.allowed).toBe(true);
    expect(allowedAgain.remaining).toBe(0);
  });
});

describe('extractClientIp', () => {
  it('x-forwarded-for icindeki ilk IP degerini kullanir', () => {
    const ip = extractClientIp((headerName) => {
      if (headerName === 'x-forwarded-for') {
        return '203.0.113.10, 10.0.0.2';
      }

      return null;
    });

    expect(ip).toBe('203.0.113.10');
  });
});

describe('buildRateLimitHeaders', () => {
  it('429 yanitlari icin retry-after degerini ekler', () => {
    const headers = buildRateLimitHeaders(
      {
        allowed: false,
        limit: 5,
        remaining: 0,
        resetAt: 1_700_000_000_000,
        retryAfterSec: 42,
      },
      true
    );

    expect(headers['x-ratelimit-limit']).toBe('5');
    expect(headers['x-ratelimit-remaining']).toBe('0');
    expect(headers['retry-after']).toBe('42');
  });
});
