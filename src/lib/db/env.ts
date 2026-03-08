export type DatabaseTarget = 'dev' | 'test' | 'prod';

function normalizeTarget(value: string | undefined): DatabaseTarget | undefined {
  if (value === 'dev' || value === 'test' || value === 'prod') {
    return value;
  }

  return undefined;
}

export function getDatabaseTarget(): DatabaseTarget {
  const explicitTarget = normalizeTarget(process.env.DB_ENV);
  if (explicitTarget) {
    return explicitTarget;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }

  if (process.env.NODE_ENV === 'production') {
    return 'prod';
  }

  return 'dev';
}

function getDatabaseUrlForTarget(target: DatabaseTarget) {
  if (target === 'test') {
    return process.env.DATABASE_TEST_URL;
  }

  if (target === 'prod') {
    return process.env.DATABASE_PROD_URL;
  }

  return process.env.DATABASE_DEV_URL;
}

export function resolveDatabaseUrl() {
  const target = getDatabaseTarget();
  const url = process.env.DATABASE_URL ?? getDatabaseUrlForTarget(target);

  return {
    target,
    url,
  };
}

export function isDatabaseConfigured() {
  const { url } = resolveDatabaseUrl();
  return Boolean(url);
}

export function getDatabaseUrl() {
  const { target, url } = resolveDatabaseUrl();

  if (!url) {
    if (target === 'test') {
      throw new Error('DATABASE_URL veya DATABASE_TEST_URL tanimlanmalidir.');
    }

    if (target === 'prod') {
      throw new Error('DATABASE_URL veya DATABASE_PROD_URL tanimlanmalidir.');
    }

    throw new Error('DATABASE_URL veya DATABASE_DEV_URL tanimlanmalidir.');
  }

  return url;
}
