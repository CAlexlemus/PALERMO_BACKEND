import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Obra, RegistroAsistencia } from '../entities';
import { ObrasController } from './obras.controller';
import { ObrasService } from './obras.service';

@Module({
  imports: [TypeOrmModule.forFeature([Obra, RegistroAsistencia])],
  controllers: [ObrasController],
  providers: [ObrasService],
  exports: [ObrasService],
})
export class ObrasModule {}