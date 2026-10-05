import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDispositivoDto {
  @ApiProperty({
    example: 'e1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'ID de la empresa dueña del dispositivo',
  })
  @IsUUID()
  empresaId!: string;

  @ApiProperty({
    example: 'c1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'ID del piloto (usuario) asignado',
  })
  @IsUUID()
  pilotoId!: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6',
    description: 'IMEI o UUID estable de la app',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  identificador!: string;

  @ApiProperty({
    example: 'android',
    description: 'Plataforma del dispositivo (android, ios, etc.)',
    maxLength: 30,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  plataforma!: string;


  @ApiProperty({
    example: true,
    description: 'mandar por defecto true',
    maxLength: 30,
  })
  @IsBoolean()
  @IsOptional()
  vigente?: boolean;
}
