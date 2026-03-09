import { createHmac } from 'node:crypto';

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|email|phone|cv|resumeContent)/i;

function anonymizeIp(ip: string) {
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
  }

  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 4).join(':')}::`;
  }

  return ip;
}

function hashWithSalt(value: string, salt: string) {
  return createHmac('sha256', salt).update(value).digest('hex');
}

export function sanitizeIp(ip: string | null | undefined) {
  if (!ip) {
    return null;
  }

  if (process.env.NODE_ENV !== 'production') {
    return ip;
  }

  const salt = process.env.LOG_IP_HASH_SALT;
  if (!salt) {
    return anonymizeIp(ip);
  }

  return hashWithSalt(ip, salt);
}

function sanitizeUnknown(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeUnknown);
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, childValue]) => {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          return [key, '[REDACTED]'];
        }

        return [key, sanitizeUnknown(childValue)];
      }
    );

    return Object.fromEntries(entries);
  }

  return value;
}

export function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined
) {
  if (!metadata) {
    return null;
  }

  return sanitizeUnknown(metadata) as Record<string, unknown>;
}

export function hashEmailForAudit(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const salt = process.env.LOG_IP_HASH_SALT;
  if (!salt) {
    return null;
  }

  return hashWithSalt(normalized, salt);
}

