import { getDb } from '@/lib/db/client';
import { LOGGING_ENABLED } from '@/config/logging';
import { isDatabaseConfigured } from '@/lib/db/env';
import { auditLogs, authEvents, requestLogs } from '@/db/schema';
import type { AuditAction } from './actions';
import { AUDIT_ACTIONS } from './actions';
import { sanitizeIp, sanitizeMetadata } from './privacy';

export type LogRequestParams = {
  traceId: string;
  userId?: string | null;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string | null;
  userAgent?: string | null;
  locale?: string | null;
};

export type LogAuditParams = {
  traceId: string;
  userId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type AuthEventName =
  | 'login'
  | 'logout'
  | 'register'
  | 'password_reset'
  | 'email_verified';

export type LogAuthParams = {
  traceId: string;
  userId?: string | null;
  emailHash?: string | null;
  event: AuthEventName;
  provider?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
  failReason?: string | null;
};

function mapAuthEventToAuditAction(event: AuthEventName): AuditAction {
  if (event === 'logout') {
    return AUDIT_ACTIONS.AUTH_LOGOUT;
  }

  if (event === 'register') {
    return AUDIT_ACTIONS.AUTH_REGISTER;
  }

  if (event === 'password_reset') {
    return AUDIT_ACTIONS.AUTH_PASSWORD_RESET;
  }

  if (event === 'email_verified') {
    return AUDIT_ACTIONS.AUTH_EMAIL_VERIFIED;
  }

  return AUDIT_ACTIONS.AUTH_LOGIN;
}

async function safeInsert(action: () => Promise<unknown>) {
  if (!LOGGING_ENABLED || !isDatabaseConfigured()) {
    return;
  }

  try {
    await action();
  } catch (error) {
    console.error('[logger] insert failed', error);
  }
}

export const logger = {
  request(params: LogRequestParams) {
    return safeInsert(async () => {
      const db = getDb();
      await db.insert(requestLogs).values({
        traceId: params.traceId,
        userId: params.userId ?? null,
        method: params.method,
        path: params.path,
        statusCode: params.statusCode,
        durationMs: params.durationMs,
        ip: sanitizeIp(params.ip),
        userAgent: params.userAgent ?? null,
        locale: params.locale ?? null,
      });
    });
  },

  audit(params: LogAuditParams) {
    return safeInsert(async () => {
      const db = getDb();
      await db.insert(auditLogs).values({
        traceId: params.traceId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        metadata: sanitizeMetadata(params.metadata),
        ip: sanitizeIp(params.ip),
        userAgent: params.userAgent ?? null,
      });
    });
  },

  auth(params: LogAuthParams) {
    return safeInsert(async () => {
      const db = getDb();
      await db.insert(authEvents).values({
        traceId: params.traceId,
        userId: params.userId ?? null,
        emailHash: params.emailHash ?? null,
        event: params.event,
        provider: params.provider ?? null,
        ip: sanitizeIp(params.ip),
        userAgent: params.userAgent ?? null,
        success: params.success ?? true,
        failReason: params.failReason ?? null,
      });

      if (params.userId) {
        await db.insert(auditLogs).values({
          traceId: params.traceId,
          userId: params.userId,
          action: mapAuthEventToAuditAction(params.event),
          metadata: sanitizeMetadata({
            provider: params.provider ?? null,
            success: params.success ?? true,
          }),
          ip: sanitizeIp(params.ip),
          userAgent: params.userAgent ?? null,
        });
      }
    });
  },
};
