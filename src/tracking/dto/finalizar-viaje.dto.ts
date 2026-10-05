import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class FinalizarViajeDto {
  @ApiProperty({
    example: '2026-10-04T16:30:00.000Z',
    description: 'Hora de finalización según el dispositivo (UTC)',
  })
  @IsDateString()
  finDispositivo!: string;

  @ApiProperty({
    example: 120,
    description:
      'Última secuencia asignada localmente (N). Completitud cuando cantidad_puntos = N',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  secuenciaFinalEsperada!: number;

  @ApiPropertyOptional({
    example: 5400000,
    description: 'Duración monotónica total del viaje en ms (opcional)',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  duracionMonotonicaMs?: number;

  @ApiPropertyOptional({
    example: 'Llegada sin GPS final',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  observaciones?: string;
}
