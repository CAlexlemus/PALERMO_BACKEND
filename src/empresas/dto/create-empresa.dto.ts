import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateEmpresaDto {
  @ApiProperty({
    example: 'Transportes del Norte',
    description: 'Nombre de la empresa',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;
}
