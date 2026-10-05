import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { GeoPointDto } from '../../common/dto/geo-point.dto';

export class CreateObraDto {
  @ApiProperty({
    example: 'Proyecto Villa Canales',
    description: 'Nombre de la obra',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @ApiPropertyOptional({
    example: 'e1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'ID de la empresa dueña de la obra',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  empresaId?: string | null;

  @ApiProperty({
    type: () => GeoPointDto,
    description: 'Ubicación geográfica de la obra (punto PostGIS)',
  })
  @ValidateNested()
  @Type(() => GeoPointDto)
  ubicacion!: GeoPointDto;

  @ApiPropertyOptional({
    example: 100,
    description: 'Radio de la geocerca en metros',
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  radioMetros?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Si la obra exige foto al marcar asistencia',
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  requiereFoto?: boolean | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Si la obra exige ubicación al marcar asistencia',
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  requiereUbicacion?: boolean | null;
}
