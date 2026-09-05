import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig, databaseConfig, validateEnv } from './config';
import { entities } from './entities';
import { AuthModule } from './auth/auth.module';
import { ObrasModule } from './obras/obras.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, databaseConfig],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const database = configService.get('database', { infer: true });

        return {
          type: 'postgres' as const,
          host: database.host,
          port: database.port,
          username: database.username,
          password: database.password,
          database: database.database,
          entities,
          autoLoadEntities: true,
          synchronize: database.synchronize,
          logging: database.logging,
          retryAttempts: 10,
          retryDelay: 3000,
        };
      },
    }),
    AuthModule,
    ObrasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
