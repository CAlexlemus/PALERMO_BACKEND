import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PuntoLoteDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  secuencia!: number;

  @ApiProperty({ example: '2026-10-04T14:00:00.000Z' })
  @IsDateString()
  capturado_en!: string;

  @ApiProperty({ example: 14.6349, description: 'Latitud WGS84' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitud!: number;

  @ApiProperty({ example: -90.5069, description: 'Longitud WGS84' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitud!: number;

  @ApiProperty({ example: 8.5, minimum: 0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  precision_m!: number;

  @ApiPropertyOptional({ example: 11.2, nullable: true, minimum: 0 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  velocidad_mps?: number | null;

  @ApiPropertyOptional({
    example: 75,
    nullable: true,
    minimum: 0,
    maximum: 359.999999,
    description: 'Rumbo en grados [0, 360)',
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(359.999999)
  rumbo_grados?: number | null;

  @ApiPropertyOptional({ example: 1480.5, nullable: true })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  altitud_m?: number | null;

  @ApiProperty({
    example: 'e69d2058-97f7-4efa-b12e-c1084945142b',
    format: 'uuid',
  })
  @IsUUID()
  sesion_captura_id!: string;

  @ApiPropertyOptional({ example: 12000, nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tiempo_monotonico_ms?: number | null;

  @ApiProperty({ example: 1, minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  segmento_local!: number;
}

export class LotePuntosDto {
  @ApiProperty({
    example: '4f0b5632-37c1-4b15-90d4-711741344247',
    format: 'uuid',
    description: 'Identificador de lote para trazabilidad (no sustituye la PK)',
  })
  @IsUUID()
  batchId!: string;

  @ApiProperty({
    type: [PuntoLoteDto],
    minItems: 1,
    maxItems: 200,
    description: 'Entre 1 y 200 puntos por solicitud',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PuntoLoteDto)
  puntos!: PuntoLoteDto[];
}
