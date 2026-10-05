import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { GeoPointDto } from '../common/dto/geo-point.dto';
import { CalidadPunto } from '../common/enums/calidad-punto.enum';
import type { GeoPoint } from '../common/types/geo-point.type';

@ApiSchema({ description: 'Muestras GPS originales de un viaje' })
@Entity({ name: 'puntos_viaje' })
export class PuntoViaje {
  @ApiProperty({ example: 'f1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @PrimaryColumn({ name: 'viaje_id', type: 'uuid' })
  viajeId!: string;

  @ApiProperty({ example: 1, description: 'Secuencia incremental del punto en el viaje' })
  @PrimaryColumn({ name: 'secuencia', type: 'bigint' })
  secuencia!: string;

  @ApiProperty({ example: '2026-10-04T14:00:00.000Z' })
  @Column({ name: 'capturado_en', type: 'timestamptz' })
  capturadoEn!: Date;

  @ApiProperty({ example: '2026-10-04T14:00:05.000Z' })
  @Column({
    name: 'recibido_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  recibidoEn!: Date;

  @ApiProperty({ type: () => GeoPointDto })
  @Column({
    name: 'geom',
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  geom!: GeoPoint;

  @ApiProperty({ example: 8.5 })
  @Column({ name: 'precision_m', type: 'real' })
  precisionM!: number;

  @ApiPropertyOptional({ example: 11.2, nullable: true })
  @Column({ name: 'velocidad_mps', type: 'real', nullable: true })
  velocidadMps!: number | null;

  @ApiPropertyOptional({ example: 75, nullable: true })
  @Column({ name: 'rumbo_grados', type: 'real', nullable: true })
  rumboGrados!: number | null;

  @ApiPropertyOptional({ example: 1480.5, nullable: true })
  @Column({ name: 'altitud_m', type: 'real', nullable: true })
  altitudM!: number | null;

  @ApiProperty({ example: 'e69d2058-97f7-4efa-b12e-c1084945142b', format: 'uuid' })
  @Column({ name: 'sesion_captura_id', type: 'uuid' })
  sesionCapturaId!: string;

  @ApiPropertyOptional({ example: 12000, nullable: true })
  @Column({ name: 'tiempo_monotonico_ms', type: 'bigint', nullable: true })
  tiempoMonotonicoMs!: string | null;

  @ApiProperty({ example: 1, default: 1 })
  @Column({ name: 'segmento_local', type: 'integer', default: 1 })
  segmentoLocal!: number;

  @ApiProperty({ enum: CalidadPunto, example: CalidadPunto.PENDIENTE })
  @Column({ name: 'calidad', type: 'text', default: CalidadPunto.PENDIENTE })
  calidad!: CalidadPunto;

  @ApiPropertyOptional({ example: 'precisión > 50 m', nullable: true })
  @Column({ name: 'motivo_calidad', type: 'text', nullable: true })
  motivoCalidad!: string | null;
}
