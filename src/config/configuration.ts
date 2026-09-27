import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  /** Orígenes permitidos (coma-separados). Si no se define, refleja el Origin de la petición. */
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true,
}));

export const databaseConfig = registerAs('database', () => ({
  /** Railway (y otros hosts) inyectan la conexión completa. En local se usan DB_*. */
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET!,
  expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
}));

export const storageConfig = registerAs('storage', () => ({
  /** Carpeta local donde se guardan fotos de asistencia (temporal hasta S3). */
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  publicBasePath: '/uploads',
}));
