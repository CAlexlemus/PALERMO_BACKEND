import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { EstadoIncidencia } from '../incidencias.constants';

export class CambiarEstadoIncidenciaDto {
  @ApiProperty({
    enum: ['en_revision', 'resuelta'],
    description:
      'Solo la transición inmediata: reportada → en_revision → resuelta.',
    example: 'en_revision',
  })
  @IsIn(['en_revision', 'resuelta'])
  estado!: Exclude<EstadoIncidencia, 'reportada'>;
}
