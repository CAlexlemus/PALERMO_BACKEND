import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  ESTADOS_INCIDENCIA,
  type EstadoIncidencia,
} from '../incidencias.constants';

function enteroODefault(value: unknown, defecto: number): number {
  if (value === undefined || value === null || value === '') {
    return defecto;
  }
  return typeof value === 'number' ? value : Number(value);
}

export class ConsultarIncidenciasDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => enteroODefault(value, 1))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => enteroODefault(value, 10))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 10;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  obra_id?: string;

  @ApiPropertyOptional({ enum: ESTADOS_INCIDENCIA })
  @IsOptional()
  @IsIn(ESTADOS_INCIDENCIA)
  estado?: EstadoIncidencia;
}
