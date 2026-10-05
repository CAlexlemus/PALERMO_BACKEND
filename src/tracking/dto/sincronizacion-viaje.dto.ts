import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoViaje } from '../../common/enums/estado-viaje.enum';

export class RangoFaltanteDto {
  @ApiProperty({ example: 3 })
  desde!: number;

  @ApiProperty({ example: 5 })
  hasta!: number;
}

export class SincronizacionViajeDto {
  @ApiProperty({ example: 'f1111111-1111-1111-1111-111111111111', format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: EstadoViaje, example: EstadoViaje.SINCRONIZANDO })
  estado!: EstadoViaje;

  @ApiProperty({ example: 118 })
  cantidadPuntos!: number;

  @ApiProperty({ example: 120 })
  ultimaSecuenciaRecibida!: number;

  @ApiPropertyOptional({ example: 120, nullable: true })
  secuenciaFinalEsperada!: number | null;

  @ApiProperty({ example: 4 })
  revisionDatos!: number;

  @ApiProperty({ example: 3 })
  revisionRuta!: number;

  @ApiProperty({
    example: false,
    description: 'true si revision_ruta < revision_datos',
  })
  rutaPendiente!: boolean;

  @ApiProperty({ type: [RangoFaltanteDto] })
  rangosFaltantes!: RangoFaltanteDto[];

  @ApiPropertyOptional({
    example: true,
    description: 'true cuando N=0 (viaje sin evidencia GPS)',
  })
  sinEvidenciaGps?: boolean;
}
