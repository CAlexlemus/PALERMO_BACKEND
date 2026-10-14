import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  /** Orígenes permitidos (coma-separados). Si no se define, refleja el Origin de la petición. */
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true,
  /**
   * URL pública de este despliegue (para Swagger y clientes).
   * En local suele omitirse; Swagger usa http://localhost:{PORT}.
   */
  publicUrl: process.env.PUBLIC_URL?.replace(/\/$/, '') || undefined,
  /**
   * URL del API en producción (Railway). Aparece como segundo servidor en Swagger.
   * Ejemplo: https://palermobackend-production.up.railway.app
   */
  productionUrl: (
    process.env.PRODUCTION_URL ??
    'https://palermobackend-production.up.railway.app'
  ).replace(/\/$/, ''),
}));

export const databaseConfig = registerAs('database', () => {
  const target = resolveDbTarget();
  const url = resolveDatabaseUrl(target);
  const usingRailway =
    target === 'railway' || Boolean(url && isRemoteDatabaseUrl(url));

  return {
    /** local | railway — controla a qué Postgres se conecta el API en desarrollo. */
    target,
    /**
     * URL completa. En local con DB_TARGET=local queda undefined y se usan DB_*.
     * En Railway (deploy) o con DB_TARGET=railway usa RAILWAY_DATABASE_URL / DATABASE_URL.
     */
    url,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    /**
     * En Railway/remoto no sincronizar esquema por defecto (evita alterar prod).
     * Fuerza con DB_SYNCHRONIZE=true solo si sabes lo que haces.
     */
    synchronize: usingRailway
      ? process.env.DB_SYNCHRONIZE === 'true' &&
        process.env.DB_SYNCHRONIZE_REMOTE === 'true'
      : process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  };
});

/** local | railway. Sin valor: si hay DATABASE_URL se comporta como deploy remoto. */
function resolveDbTarget(): 'local' | 'railway' {
  const raw = (process.env.DB_TARGET ?? '').trim().toLowerCase();
  if (raw === 'local' || raw === 'railway') {
    return raw;
  }
  return process.env.DATABASE_URL ? 'railway' : 'local';
}

function resolveDatabaseUrl(target: 'local' | 'railway'): string | undefined {
  if (target === 'local') {
    return undefined;
  }

  const railwayUrl = process.env.RAILWAY_DATABASE_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return railwayUrl || databaseUrl || undefined;
}

function isRemoteDatabaseUrl(databaseUrl: string): boolean {
  try {
    const hostname = new URL(databaseUrl).hostname;
    return (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !hostname.endsWith('railway.internal')
    );
  } catch {
    return false;
  }
}

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET!,
  expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
}));

export const storageConfig = registerAs('storage', () => ({
  /** Carpeta local donde se guardan fotos de asistencia (temporal hasta S3). */
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  publicBasePath: '/uploads',
}));

/**
 * Bucket S3 compatible (Railway). Las fotos de incidencias son privadas:
 * en PostgreSQL solo se guarda la clave del objeto.
 */
export const s3Config = registerAs('s3', () => {
  const urlStyle = (process.env.AWS_S3_URL_STYLE ?? 'virtual')
    .trim()
    .toLowerCase();

  return {
    endpoint: process.env.AWS_ENDPOINT_URL?.trim() || undefined,
    bucket: process.env.AWS_S3_BUCKET_NAME?.trim() || undefined,
    region: process.env.AWS_DEFAULT_REGION?.trim() || 'auto',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim() || undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim() || undefined,
    /** `virtual` (Railway por defecto) o `path` si AWS_S3_URL_STYLE=path. */
    forcePathStyle: urlStyle === 'path',
  };
});
