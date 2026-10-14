import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

function textoRecortado(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CrearIncidenciaDto {
  @ApiProperty({
    minLength: 3,
    maxLength: 200,
    example: 'Portón principal dañado',
  })
  @Transform(({ value }) => textoRecortado(value))
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  titulo!: string;

  @ApiProperty({
    minLength: 5,
    maxLength: 5000,
    example: 'La cerradura no funciona durante el rondín.',
  })
  @Transform(({ value }) => textoRecortado(value))
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  descripcion!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  obra_id!: string;
}
