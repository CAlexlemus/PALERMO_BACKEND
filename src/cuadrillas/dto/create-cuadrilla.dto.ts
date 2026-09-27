import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCuadrillaDto {
  @ApiProperty({
    example: 'Obra Gris',
    description: 'Nombre de la cuadrilla',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({
    example: 'a1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'ID de la obra a la que pertenece la cuadrilla',
  })
  @IsUUID()
  obraId!: string;
}
