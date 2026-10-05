import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { GeoPointDto } from '../common/dto/geo-point.dto';
import type { GeoPoint } from '../common/types/geo-point.type';

@ApiSchema({ description: 'Obras o proyectos con geocerca PostGIS' })
@Entity({ name: 'obras' })
export class Obra {
  @ApiProperty({ example: 'a1111111-1111-1111-1111-111111111111', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ApiProperty({ example: 'Proyecto Villa Canales', maxLength: 150 })
  @Column({ name: 'nombre', type: 'varchar', length: 150 })
  nombre!: string;

  @ApiPropertyOptional({
    example: 'e1111111-1111-1111-1111-111111111111',
    format: 'uuid',
    nullable: true,
    description: 'Empresa dueña de la obra (misma empresa del piloto al crear viajes)',
  })
  @Column({ name: 'empresaid', type: 'uuid', nullable: true })
  empresaId!: string | null;

  @ApiProperty({ type: () => GeoPointDto })
  @Column({
    name: 'ubicacion',
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  ubicacion!: GeoPoint;

  @ApiProperty({ example: 100, default: 50 })
  @Column({ name: 'radiometros', type: 'integer', default: 50 })
  radioMetros!: number;

  @ApiPropertyOptional({ example: true })
  @Column({ name: 'requierefoto', type: 'boolean', nullable: true })
  requiereFoto!: boolean | null;

  @ApiPropertyOptional({ example: true })
  @Column({ name: 'requiereubicacion', type: 'boolean', nullable: true })
  requiereUbicacion!: boolean | null;

  @ApiProperty({
    example: true,
    description: 'Si es false, la obra se considera eliminada (baja lógica)',
    default: true,
  })
  @Column({ name: 'vigente', type: 'boolean', default: true })
  vigente!: boolean;
}
