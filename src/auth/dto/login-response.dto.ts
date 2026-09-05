import { ApiProperty } from '@nestjs/swagger';

export class UsuarioPublicoDto {
  @ApiProperty({ example: 'c1111111-1111-1111-1111-111111111111', format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'pedro.obrero' })
  nombreUsuario!: string;

  @ApiProperty({ example: 3 })
  rolId!: number;

  @ApiProperty({
    example: 'b1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    nullable: true,
  })
  jefeId!: string | null;

  @ApiProperty({ example: 1, nullable: true })
  cuadrillaId!: number | null;

  @ApiProperty({ example: 1, nullable: true })
  turnoId!: number | null;

  @ApiProperty({ example: true, nullable: true })
  requiereFoto!: boolean | null;

  @ApiProperty({ example: true, nullable: true })
  requiereUbicacion!: boolean | null;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Inicio de sesión exitoso' })
  message!: string;

  @ApiProperty({ type: () => UsuarioPublicoDto })
  usuario!: UsuarioPublicoDto;
}
