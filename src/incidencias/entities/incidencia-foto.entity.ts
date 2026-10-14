import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Mapeo fiel de `incidencia_fotos`. El binario vive en el bucket, no en PostgreSQL. */
@Entity({ name: 'incidencia_fotos' })
export class IncidenciaFoto {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'incidencia_id', type: 'uuid' })
  incidenciaId!: string;

  @Column({ name: 'archivo_clave', type: 'text', unique: true })
  archivoClave!: string;

  @Column({
    name: 'nombre_archivo',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  nombreArchivo!: string | null;

  @Column({ name: 'tipo_mime', type: 'varchar', length: 100, nullable: true })
  tipoMime!: string | null;

  @Column({
    name: 'fecha_registro',
    type: 'timestamptz',
    default: () => 'NOW()',
    insert: false,
    update: false,
  })
  fechaRegistro!: Date;
}
