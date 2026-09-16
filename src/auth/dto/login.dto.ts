import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

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
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  contrasena!: string;
}
