export function validateEnv(config: Record<string, unknown>) {
  const requiredKeys = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
  ] as const;

  const missingKeys = requiredKeys.filter((key) => !config[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(', ')}`,
    );
  }

  const port = Number(config.DB_PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('DB_PORT must be a positive integer');
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
