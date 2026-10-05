import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  storageConfig,
  validateEnv,
} from './config';
import { entities } from './entities';
import { AsistenciasModule } from './asistencias/asistencias.module';
import { AuthModule } from './auth/auth.module';
import { CuadrillasModule } from './cuadrillas/cuadrillas.module';
import { DispositivosModule } from './dispositivos/dispositivos.module';
import { EmpresasModule } from './empresas/empresas.module';
import { ObrasModule } from './obras/obras.module';
import { StorageModule } from './storage/storage.module';
import { TrackingModule } from './tracking/tracking.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, databaseConfig, jwtConfig, storageConfig],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const database = configService.get('database', { infer: true });

        const common = {
          type: 'postgres' as const,
          entities,
          autoLoadEntities: true,
          synchronize: database.synchronize,
          logging: database.logging,
          retryAttempts: 10,
          retryDelay: 3000,
        };

        if (database.url) {
          return {
            ...common,
            url: database.url,
            ssl: needsDatabaseSsl(database.url)
              ? { rejectUnauthorized: false }
              : false,
          };
        }

        return {
          ...common,
          host: database.host,
          port: database.port,
          username: database.username,
          password: database.password,
          database: database.database,
        };
      },
    }),
    AuthModule,
    EmpresasModule,
    DispositivosModule,
    VehiculosModule,
    ObrasModule,
    CuadrillasModule,
    AsistenciasModule,
    TrackingModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

/** La red privada de Railway y localhost no usan TLS. El proxy público sí. */
function needsDatabaseSsl(databaseUrl: string): boolean {
  let hostname: string;

  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    return false;
  }

  return (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.endsWith('railway.internal')
  );
}
