import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { EstadoIncidencia } from '../incidencias.constants';

/**
 * Mapeo fiel de la tabla `incidencias` ya creada en PostgreSQL.
 * `fecha_registro` la asigna la base con NOW(); no se envía en el INSERT.
 */
@Entity({ name: 'incidencias' })
export class Incidencia {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId!: string;

  @Column({ name: 'obra_id', type: 'uuid' })
  obraId!: string;

  @Column({ name: 'titulo', type: 'varchar', length: 200 })
  titulo!: string;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion!: string;

  @Column({ name: 'estado', type: 'varchar', length: 30, default: 'reportada' })
  estado!: EstadoIncidencia;

  @Column({
    name: 'fecha_registro',
    type: 'timestamptz',
    default: () => 'NOW()',
    insert: false,
    update: false,
  })
  fechaRegistro!: Date;
}
