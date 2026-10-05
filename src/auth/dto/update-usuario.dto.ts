import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({
    example: 'pedro.obrero',
    description: 'Nombre de usuario único',
    maxLength: 50,
  })
  @Transform(({ value, obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() || undefined : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombreUsuario?: string;

  @ApiPropertyOptional({
    example: 'MiPassword123',
    description: 'Nueva contraseña en texto plano',
    minLength: 6,
    format: 'password',
  })
  @Transform(({ value, obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() || undefined : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(6)
  contrasena?: string;

  @ApiPropertyOptional({ example: 3, description: 'ID del rol asignado' })
  @Transform(({ value, obj, key }) =>
    obj[key] === '' || obj[key] === null ? undefined : value,
  )
  @IsOptional()
  @IsInt()
  rolId?: number;

  @ApiPropertyOptional({
    example: 'b1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'ID del jefe inmediato',
  })
  @Transform(({ value, obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() || undefined : value,
  )
  @IsOptional()
  @IsUUID()
  jefeId?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la cuadrilla a la que pertenece',
  })
  @Transform(({ value, obj, key }) =>
    obj[key] === '' || obj[key] === null ? undefined : value,
  )
  @IsOptional()
  @IsInt()
  cuadrillaId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del turno asignado' })
  @Transform(({ value, obj, key }) =>
    obj[key] === '' || obj[key] === null ? undefined : value,
  )
  @IsOptional()
  @IsInt()
  turnoId?: number;

  @ApiPropertyOptional({
    example: 'e1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'ID de la empresa a la que pertenece el usuario',
  })
  @Transform(({ value, obj, key }) =>
    typeof obj[key] === 'string' ? obj[key].trim() || undefined : value,
  )
  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el usuario debe capturar foto al marcar asistencia',
  })
  @Transform(({ value, obj, key }) =>
    obj[key] === '' || obj[key] === null ? undefined : value,
  )
  @IsOptional()
  @IsBoolean()
  requiereFoto?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el usuario debe enviar ubicación al marcar asistencia',
  })
  @Transform(({ value, obj, key }) =>
    obj[key] === '' || obj[key] === null ? undefined : value,
  )
  @IsOptional()
  @IsBoolean()
  requiereUbicacion?: boolean;
}
