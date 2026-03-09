function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export const DATA_RETENTION_DAYS = {
  requestLogs: parsePositiveInteger(process.env.LOG_RETENTION_REQUEST_DAYS, 90),
  auditLogs: parsePositiveInteger(process.env.LOG_RETENTION_AUDIT_DAYS, 365),
  authEvents: parsePositiveInteger(process.env.LOG_RETENTION_AUTH_DAYS, 365),
} as const;

