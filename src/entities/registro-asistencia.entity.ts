import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { GeoPointDto } from '../common/dto/geo-point.dto';
import { EstadoAsistencia, TipoEvento } from '../common/enums';
import type { GeoPoint } from '../common/types/geo-point.type';

@ApiSchema({ description: 'Registros de entrada y salida en obra' })
@Entity({ name: 'registrosasistencia' })
export class RegistroAsistencia {
  @ApiProperty({ example: 'd1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'c1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'usuarioid', type: 'uuid' })
  usuarioId!: string;

  @ApiProperty({ example: 'a1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'obraid', type: 'uuid' })
  obraId!: string;

  @ApiProperty({ enum: TipoEvento, example: TipoEvento.ENTRADA })
  @Column({ name: 'tipoevento', type: 'varchar', length: 15 })
  tipoEvento!: TipoEvento;

  @ApiProperty({
    example: '2024-05-15T07:55:00.000',
    description: 'Reloj de America/Mexico_City al tomar la asistencia',
  })
  @Column({ name: 'fechahoradispositivo', type: 'timestamp' })
  fechaHoraDispositivo!: Date;

  @ApiProperty({
    example: '2024-05-15T07:55:10.000',
    description: 'Reloj de America/Mexico_City al recibir el registro',
  })
  @Column({
    name: 'fechahoraservidor',
    type: 'timestamp',
    default: () => "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')",
  })
  fechaHoraServidor!: Date;

  @ApiProperty({ example: false, default: false })
  @Column({ name: 'essincronizacionoffline', type: 'boolean', default: false })
  esSincronizacionOffline!: boolean;

  @ApiPropertyOptional({ type: () => GeoPointDto, nullable: true })
  @Column({
    name: 'ubicacion',
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  ubicacion!: GeoPoint | null;

  @ApiPropertyOptional({ example: '1200.00', nullable: true })
  @Column({
    name: 'altitud',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  altitud!: string | null;

  @ApiPropertyOptional({
    example: 'Mozilla/5.0 (Linux; Android 13)',
    nullable: true,
  })
  @Column({
    name: 'agentedispositivo',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  agenteDispositivo!: string | null;

  @ApiPropertyOptional({ example: '192.168.1.55', nullable: true })
  @Column({ name: 'direccionip', type: 'varchar', length: 45, nullable: true })
  direccionIp!: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/foto.jpg', nullable: true })
  @Column({ name: 'urlfoto', type: 'text', nullable: true })
  urlFoto!: string | null;

  @ApiProperty({ enum: EstadoAsistencia, example: EstadoAsistencia.A_TIEMPO })
  @Column({ name: 'estado', type: 'varchar', length: 30 })
  estado!: EstadoAsistencia;
}
