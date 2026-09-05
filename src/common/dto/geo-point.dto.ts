import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsNumber,
} from 'class-validator';

export class GeoPointDto {
  @ApiProperty({ example: 'Point', enum: ['Point'] })
  @Equals('Point')
  type!: 'Point';

  @ApiProperty({
    example: [-90.531, 14.482],
    description: 'Coordenadas [longitud, latitud] en SRID 4326',
    type: [Number],
    minItems: 2,
    maxItems: 2,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates!: [number, number];
}
