import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ConsultarAsistenciasObraDto {
  @ApiProperty({
    example: '2026-09-15',
    description:
      'Inicio del rango (inclusive). Acepta fecha (`YYYY-MM-DD`) o fecha-hora ISO.',
  })
  @IsDateString()
  fechaInicio!: string;

  @ApiProperty({
    example: '2026-09-23',
    description:
      'Fin del rango (inclusive). Si solo se envía fecha (`YYYY-MM-DD`), se toma hasta las 23:59:59.999.',
  })
  @IsDateString()
  fechaFin!: string;
}
