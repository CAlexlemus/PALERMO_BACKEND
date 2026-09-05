import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'carlos.jefe',
    description: 'Nombre de usuario',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombreUsuario!: string;

  @ApiProperty({
    example: 'MiPassword123',
    description: 'Contraseña',
    minLength: 6,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  contrasena!: string;
}
