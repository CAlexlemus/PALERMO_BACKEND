import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cuadrilla, Obra, Usuario } from '../entities';
import { CuadrillasController } from './cuadrillas.controller';
import { CuadrillasService } from './cuadrillas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cuadrilla, Obra, Usuario])],
  controllers: [CuadrillasController],
  providers: [CuadrillasService],
  exports: [CuadrillasService],
})
export class CuadrillasModule {}
