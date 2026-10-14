import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Cuadrilla, Obra, Usuario } from '../entities';
import { IncidenciaFoto } from './entities/incidencia-foto.entity';
import { Incidencia } from './entities/incidencia.entity';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { IncidenciasStorageService } from './storage/incidencias-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Incidencia,
      IncidenciaFoto,
      Obra,
      Cuadrilla,
      Usuario,
    ]),
    AuthModule,
  ],
  controllers: [IncidenciasController],
  providers: [IncidenciasService, IncidenciasStorageService],
})
export class IncidenciasModule {}
