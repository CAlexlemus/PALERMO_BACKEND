import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { GeoLineString } from '../common/types/geo-line-string.type';

@ApiSchema({
  description: 'Segmentos de línea derivados para dibujar la ruta',
})
@Entity({ name: 'segmentos_viaje' })
export class SegmentoViaje {
  @ApiProperty({ example: 'f1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @PrimaryColumn({ name: 'viaje_id', type: 'uuid' })
  viajeId!: string;

  @ApiProperty({ example: 1 })
  @PrimaryColumn({ name: 'numero', type: 'integer' })
  numero!: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'secuencia_desde', type: 'bigint' })
  secuenciaDesde!: string;

  @ApiProperty({ example: 40 })
  @Column({ name: 'secuencia_hasta', type: 'bigint' })
  secuenciaHasta!: string;

  @ApiProperty({
    description: 'LineString WGS84 (longitud, latitud)',
    example: {
      type: 'LineString',
      coordinates: [
        [-90.5069, 14.6349],
        [-90.505, 14.636],
      ],
    },
  })
  @Column({
    name: 'geom',
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  geom!: GeoLineString;

  @ApiProperty({ example: 1250.4 })
  @Column({ name: 'distancia_m', type: 'double precision' })
  distanciaM!: number;

  @ApiProperty({ example: 3 })
  @Column({ name: 'revision_origen', type: 'bigint' })
  revisionOrigen!: string;
}
