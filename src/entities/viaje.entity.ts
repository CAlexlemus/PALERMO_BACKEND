import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EstadoViaje } from '../common/enums/estado-viaje.enum';

@ApiSchema({ description: 'Viajes de transporte rastreados' })
@Entity({ name: 'viajes' })
export class Viaje {
  @ApiProperty({
    example: 'f1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    description: 'UUID generado en la app (permite inicio sin conexión)',
  })
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'e1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId!: string;

  @ApiProperty({ example: 'c1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'piloto_id', type: 'uuid' })
  pilotoId!: string;

  @ApiProperty({ example: 'a1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'obra_destino_id', type: 'uuid' })
  obraDestinoId!: string;

  @ApiProperty({ example: 'd1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @Column({ name: 'dispositivo_id', type: 'uuid' })
  dispositivoId!: string;

  @ApiPropertyOptional({
    example: 'v1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'vehiculo_id', type: 'uuid', nullable: true })
  vehiculoId!: string | null;

  @ApiProperty({ enum: EstadoViaje, example: EstadoViaje.EN_CURSO })
  @Column({ name: 'estado', type: 'text', default: EstadoViaje.EN_CURSO })
  estado!: EstadoViaje;

  @ApiProperty({ example: '2026-10-04T14:00:00.000Z' })
  @Column({ name: 'inicio_dispositivo', type: 'timestamptz' })
  inicioDispositivo!: Date;

  @ApiPropertyOptional({ example: '2026-10-04T16:30:00.000Z', nullable: true })
  @Column({ name: 'fin_dispositivo', type: 'timestamptz', nullable: true })
  finDispositivo!: Date | null;

  @ApiProperty({ example: '2026-10-04T14:00:05.000Z' })
  @Column({
    name: 'creado_servidor',
    type: 'timestamptz',
    default: () => 'now()',
  })
  creadoServidor!: Date;

  @ApiPropertyOptional({ example: '2026-10-04T16:30:10.000Z', nullable: true })
  @Column({ name: 'cierre_recibido_servidor', type: 'timestamptz', nullable: true })
  cierreRecibidoServidor!: Date | null;

  @ApiPropertyOptional({ example: '2026-10-04T16:29:00.000Z', nullable: true })
  @Column({ name: 'ultima_recepcion_servidor', type: 'timestamptz', nullable: true })
  ultimaRecepcionServidor!: Date | null;

  @ApiPropertyOptional({ example: 120, nullable: true })
  @Column({ name: 'secuencia_final_esperada', type: 'bigint', nullable: true })
  secuenciaFinalEsperada!: string | null;

  @ApiProperty({ example: 0, default: 0 })
  @Column({ name: 'cantidad_puntos', type: 'bigint', default: 0 })
  cantidadPuntos!: string;

  @ApiProperty({ example: 0, default: 0 })
  @Column({ name: 'ultima_secuencia_recibida', type: 'bigint', default: 0 })
  ultimaSecuenciaRecibida!: string;

  @ApiProperty({ example: 0, default: 0 })
  @Column({ name: 'revision_datos', type: 'bigint', default: 0 })
  revisionDatos!: string;

  @ApiProperty({ example: 0, default: 0 })
  @Column({ name: 'revision_ruta', type: 'bigint', default: 0 })
  revisionRuta!: string;

  @ApiPropertyOptional({ example: 15420.5, nullable: true })
  @Column({
    name: 'distancia_observada_m',
    type: 'double precision',
    nullable: true,
  })
  distanciaObservadaM!: number | null;

  @ApiPropertyOptional({ example: 5400000, nullable: true })
  @Column({ name: 'duracion_monotonica_ms', type: 'bigint', nullable: true })
  duracionMonotonicaMs!: string | null;

  @ApiPropertyOptional({ example: 'Retraso por tráfico', nullable: true })
  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;
}
