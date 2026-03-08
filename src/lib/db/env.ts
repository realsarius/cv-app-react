const databaseUrl = process.env.DATABASE_URL;

export function isDatabaseConfigured() {
  return Boolean(databaseUrl);
}

export function getDatabaseUrl() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL tanimlanmalidir.');
  }

  return databaseUrl;
}
