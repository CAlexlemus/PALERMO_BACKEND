import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ConsultaPuntosDto {
  @ApiPropertyOptional({
    example: 0,
    description: 'Devolver puntos con secuencia estrictamente mayor a este valor',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  despuesDe?: number = 0;

  @ApiPropertyOptional({
    example: 200,
    description: 'Máximo de puntos a devolver',
    minimum: 1,
    maximum: 500,
    default: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limite?: number = 200;
}
