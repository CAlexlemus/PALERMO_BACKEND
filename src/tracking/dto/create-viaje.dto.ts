import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateViajeDto {
  @ApiProperty({
    example: 'f1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'UUID generado en la app (permite inicio sin conexión)',
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    example: 'a1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'Obra destino del viaje (misma empresa del piloto)',
  })
  @IsUUID()
  obraDestinoId!: string;

  @ApiProperty({
    example: 'd1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'Dispositivo vigente de la misma empresa del piloto',
  })
  @IsUUID()
  dispositivoId!: string;

  @ApiPropertyOptional({
    example: 'v1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    nullable: true,
    description: 'Vehículo opcional de la misma empresa',
  })
  @IsOptional()
  @IsUUID()
  vehiculoId?: string | null;

  @ApiProperty({
    example: '2026-10-04T14:00:00.000Z',
    description: 'Hora de inicio según el dispositivo (UTC)',
  })
  @IsDateString()
  inicioDispositivo!: string;

  @ApiPropertyOptional({
    example: 'Carga de arena',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  observaciones?: string;
}
