export function validateEnv(config: Record<string, unknown>) {
  const rawTarget = String(config.DB_TARGET ?? '')
    .trim()
    .toLowerCase();
  if (rawTarget && rawTarget !== 'local' && rawTarget !== 'railway') {
    throw new Error('DB_TARGET must be "local" or "railway"');
  }

  const target: 'local' | 'railway' =
    rawTarget === 'local' || rawTarget === 'railway'
      ? rawTarget
      : typeof config.DATABASE_URL === 'string' && config.DATABASE_URL.length > 0
        ? 'railway'
        : 'local';

  const railwayUrl =
    typeof config.RAILWAY_DATABASE_URL === 'string'
      ? config.RAILWAY_DATABASE_URL.trim()
      : '';
  const databaseUrl =
    typeof config.DATABASE_URL === 'string' ? config.DATABASE_URL.trim() : '';
  const hasRemoteUrl = Boolean(railwayUrl || databaseUrl);

  if (target === 'railway') {
    if (!hasRemoteUrl) {
      throw new Error(
        'DB_TARGET=railway requiere RAILWAY_DATABASE_URL (URL pública de Postgres en Railway) o DATABASE_URL.',
      );
    }
  } else {
    const requiredKeys = [
      'DB_HOST',
      'DB_PORT',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_NAME',
    ] as const;

    const missingKeys = requiredKeys.filter((key) => !config[key]);

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingKeys.join(', ')}. Set DB_* for local or DB_TARGET=railway with RAILWAY_DATABASE_URL.`,
      );
    }

    const port = Number(config.DB_PORT);
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('DB_PORT must be a positive integer');
    }
  }

  if (!config.JWT_SECRET) {
    throw new Error('Missing required environment variables: JWT_SECRET');
  }

  const appPort = Number(config.PORT ?? 3000);
  if (!Number.isInteger(appPort) || appPort <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  if (typeof config.JWT_SECRET !== 'string' || config.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET must be a string with at least 16 characters');
  }

  return config;
}
