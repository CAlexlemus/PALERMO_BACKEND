import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Obra, RegistroAsistencia, Rol, Usuario } from '../entities';
import { StorageModule } from '../storage/storage.module';
import { AsistenciasController } from './asistencias.controller';
import { AsistenciasService } from './asistencias.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistroAsistencia, Usuario, Obra, Rol]),
    AuthModule,
    StorageModule,
  ],
  controllers: [AsistenciasController],
  providers: [AsistenciasService],
  exports: [AsistenciasService],
})
export class AsistenciasModule {}
