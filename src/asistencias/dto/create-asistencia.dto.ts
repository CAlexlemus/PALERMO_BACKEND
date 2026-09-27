import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { GeoPointDto } from '../../common/dto/geo-point.dto';
import { EstadoAsistencia, TipoEvento } from '../../common/enums';

function parseGeoPointField({ value }: { value: unknown }) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return plainToInstance(GeoPointDto, parsed);
  } catch {
    return value;
  }
}

function parseBooleanField({ value }: { value: unknown }) {
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return value;
}

export class CreateAsistenciaDto {
  @ApiPropertyOptional({
    example: 'd1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description:
      'ID del registro (útil para sincronización offline). Si se omite, el servidor lo genera.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    example: 'a1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'Obra donde se marca la asistencia',
  })
  @IsUUID()
  obraId!: string;

  @ApiProperty({ enum: TipoEvento, example: TipoEvento.ENTRADA })
  @IsEnum(TipoEvento)
  tipoEvento!: TipoEvento;

  @ApiProperty({
    example: '2024-05-15T07:55:00.000Z',
    description: 'Fecha/hora capturada en el dispositivo',
  })
  @IsDateString()
  fechaHoraDispositivo!: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si el registro proviene de sincronización offline',
    default: false,
  })
  @IsOptional()
  @Transform(parseBooleanField)
  @IsBoolean()
  esSincronizacionOffline?: boolean;

  @ApiPropertyOptional({
    type: () => GeoPointDto,
    description:
      'Ubicación del dispositivo al marcar. Obligatoria si el requisito resuelto lo exige. En multipart enviar como JSON string.',
    nullable: true,
  })
  @IsOptional()
  @Transform(parseGeoPointField)
  @ValidateNested()
  ubicacion?: GeoPointDto | null;

  @ApiPropertyOptional({
    example: 1200.0,
    description: 'Altitud en metros',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  altitud?: number | null;

  @ApiPropertyOptional({
    example: 'Mozilla/5.0 (Linux; Android 13)',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  agenteDispositivo?: string | null;

  @ApiPropertyOptional({
    example: '192.168.1.55',
    maxLength: 45,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  direccionIp?: string | null;

  @ApiPropertyOptional({
    enum: EstadoAsistencia,
    example: EstadoAsistencia.A_TIEMPO,
    description: 'Estado del registro. Por defecto A_TIEMPO.',
  })
  @IsOptional()
  @IsEnum(EstadoAsistencia)
  estado?: EstadoAsistencia;
}
