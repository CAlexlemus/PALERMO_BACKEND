import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port = configService.get('app.port', { infer: true });
  const corsOrigin = configService.get('app.corsOrigin', { infer: true });
  const uploadsDir =
    configService.get<string>('storage.uploadsDir') ?? 'uploads';
  const dbTarget = configService.get<string>('database.target') ?? 'local';
  const dbUrl = configService.get<string>('database.url');
  const dbHost =
    (dbUrl ? safeHostname(dbUrl) : undefined) ??
    configService.get<string>('database.host') ??
    'unknown';

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useStaticAssets(join(process.cwd(), uploadsDir), {
    prefix: '/uploads',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  setupSwagger(app);

  await app.listen(port, '0.0.0.0');
  logger.log(`DB target: ${dbTarget} → ${dbHost}`);
}

function safeHostname(databaseUrl: string): string | undefined {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return undefined;
  }
}

bootstrap();
