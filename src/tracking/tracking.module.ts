import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  Dispositivo,
  Obra,
  PuntoViaje,
  SegmentoViaje,
  Vehiculo,
  Viaje,
} from '../entities';
import { IngestaService } from './ingesta.service';
import { PuntosController } from './puntos.controller';
import { RutasService } from './rutas.service';
import { RutasWorker } from './rutas.worker';
import { ViajesController } from './viajes.controller';
import { ViajesService } from './viajes.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    TypeOrmModule.forFeature([
      Viaje,
      PuntoViaje,
      SegmentoViaje,
      Obra,
      Dispositivo,
      Vehiculo,
    ]),
  ],
  controllers: [ViajesController, PuntosController],
  providers: [ViajesService, IngestaService, RutasService, RutasWorker],
  exports: [ViajesService, IngestaService, RutasService],
})
export class TrackingModule {}
