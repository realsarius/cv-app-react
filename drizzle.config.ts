import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

type DrizzleTarget = 'dev' | 'test' | 'prod';

function parseTarget(value: string | undefined): DrizzleTarget {
  if (value === 'test' || value === 'prod') {
    return value;
  }

  return 'dev';
}

function buildUrl(
  host: string,
  port: string,
  dbName: string,
  user: string,
  password: string
) {
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
}

function resolveDatabaseUrl() {
  const target = parseTarget(process.env.DB_ENV);

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (target === 'test') {
    return (
      process.env.DATABASE_TEST_URL ??
      buildUrl(
        process.env.DATABASE_TEST_HOST ?? 'localhost',
        process.env.DATABASE_TEST_PORT ?? '5441',
        process.env.DATABASE_TEST_NAME ?? 'cv_app_test',
        process.env.DATABASE_TEST_USER ?? 'cv_test_user',
        process.env.DATABASE_TEST_PASSWORD ?? 'test_password'
      )
    );
  }

  if (target === 'prod') {
    return (
      process.env.DATABASE_PROD_URL ??
      buildUrl(
        process.env.DATABASE_PROD_HOST ?? 'localhost',
        process.env.DATABASE_PROD_PORT ?? '5442',
        process.env.DATABASE_PROD_NAME ?? 'cv_app_prod',
        process.env.DATABASE_PROD_USER ?? 'cv_prod_user',
        process.env.DATABASE_PROD_PASSWORD ?? 'prod_password'
      )
    );
  }

  return (
    process.env.DATABASE_DEV_URL ??
    buildUrl(
      process.env.DATABASE_DEV_HOST ?? 'localhost',
      process.env.DATABASE_DEV_PORT ?? '5440',
      process.env.DATABASE_DEV_NAME ?? 'cv_app_dev',
      process.env.DATABASE_DEV_USER ?? 'cv_dev_user',
      process.env.DATABASE_DEV_PASSWORD ?? 'dev_password'
    )
  );
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});
