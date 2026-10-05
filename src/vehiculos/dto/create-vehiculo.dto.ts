import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateVehiculoDto {
  @ApiProperty({
    example: 'e1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'ID de la empresa dueña del vehículo',
  })
  @IsUUID()
  empresaId!: string;

  @ApiProperty({
    example: 'P-123ABC',
    description: 'Placa del vehículo',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  placa!: string;

  @ApiPropertyOptional({
    example: 'Camión tolva 10 m³',
    description: 'Descripción opcional del vehículo',
    maxLength: 200,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string | null;
}
