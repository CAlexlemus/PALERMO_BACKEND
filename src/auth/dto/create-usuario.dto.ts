import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty({
    example: 'pedro.obrero',
    description: 'Nombre de usuario único',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombreUsuario!: string;

  @ApiProperty({
    example: 'MiPassword123',
    description: 'Contraseña en texto plano (se hashea en el servidor)',
    minLength: 6,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  contrasena!: string;

  @ApiProperty({
    example: 3,
    description: 'ID del rol asignado',
  })
  @IsInt()
  rolId!: number;

  @ApiPropertyOptional({
    example: 'b1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'ID del jefe inmediato',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  jefeId?: string | null;

  @ApiProperty({
    example: 1,
    description: 'ID de la cuadrilla a la que pertenece',
  })
  @IsInt()
  cuadrillaId!: number;

  @ApiProperty({
    example: 1,
    description: 'ID del turno asignado',
  })
  @IsInt()
  turnoId!: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el usuario debe capturar foto al marcar asistencia',
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  requiereFoto?: boolean | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el usuario debe enviar ubicación al marcar asistencia',
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  requiereUbicacion?: boolean | null;
}
