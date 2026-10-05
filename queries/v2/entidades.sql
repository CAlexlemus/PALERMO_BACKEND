import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique, Check, Index, Exclusion } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Point, Polygon, LineString } from 'geojson';

// El DDL versionado es la autoridad. synchronize:false, migrationsRun según despliegue.
// No activar cascadas ORM: los históricos se conservan. bigint se representa con string.
export abstract class AuditColumns {
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}

@Entity({ schema: 'asistencia_v2', name: 'empresas' })
export class Empresa extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'nombre', type: 'text' }) nombre!: string;
  @Column({ name: 'zona_horaria', type: 'text', default: "America/Guatemala" }) zonaHoraria!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
}

@Entity({ schema: 'asistencia_v2', name: 'roles' })
@Unique('uq_roles_0', ["nombre"])
export class Rol extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'nombre', type: 'text' }) nombre!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
}

@Entity({ schema: 'asistencia_v2', name: 'usuarios' })
@Unique('uq_usuarios_0', ["nombreUsuario"])
export class Usuario extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'nombre_usuario', type: 'text' }) nombreUsuario!: string;
  @Column({ name: 'contrasena_hash', type: 'text', select: false }) contrasenaHash!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
}

@Entity({ schema: 'asistencia_v2', name: 'usuario_empresas' })
@Unique('uq_usuario_empresas_0', ["usuarioId", "empresaId"])
@Unique('uq_usuario_empresas_1', ["id", "empresaId"])
@Check('ck_usuario_empresas_0', "vigente_hasta IS NULL OR vigente_hasta > vigente_desde")
@Check('ck_usuario_empresas_1', "jefe_membresia_id IS NULL OR jefe_membresia_id <> id")
export class UsuarioEmpresa extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'usuario_id', type: 'uuid' }) usuarioId!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'rol_id', type: 'uuid' }) rolId!: string;
  @Column({ name: 'jefe_membresia_id', type: 'uuid', nullable: true }) jefeMembresiaId!: string | null;
  @Column({ name: 'vigente_desde', type: 'timestamptz', default: () => "now()" }) vigenteDesde!: Date;
  @Column({ name: 'vigente_hasta', type: 'timestamptz', nullable: true }) vigenteHasta!: Date | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'usuario_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_usuario_empresas_0' }])
  usuario!: Relation<Usuario>;
  @ManyToOne(() => Empresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'empresa_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_usuario_empresas_1' }])
  empresa!: Relation<Empresa>;
  @ManyToOne(() => Rol, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'rol_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_usuario_empresas_2' }])
  rol!: Relation<Rol>;
  @ManyToOne(() => UsuarioEmpresa, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'jefe_membresia_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_usuario_empresas_3' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_usuario_empresas_3' }])
  jefe!: Relation<UsuarioEmpresa> | null;
}

@Entity({ schema: 'asistencia_v2', name: 'centros_trabajo' })
@Unique('uq_centros_trabajo_0', ["id", "empresaId"])
@Check('ck_centros_trabajo_0', "tipo IN ('OBRA','OFICINA','BASE','OTRO')")
export class CentroTrabajo extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'nombre', type: 'text' }) nombre!: string;
  @Column({ name: 'tipo', type: 'text' }) tipo!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @ManyToOne(() => Empresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'empresa_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_centros_trabajo_0' }])
  empresa!: Relation<Empresa>;
}

@Entity({ schema: 'asistencia_v2', name: 'cuadrillas' })
@Unique('uq_cuadrillas_0', ["id", "centroId", "empresaId"])
export class Cuadrilla extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'centro_id', type: 'uuid' }) centroId!: string;
  @Column({ name: 'nombre', type: 'text' }) nombre!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @ManyToOne(() => CentroTrabajo, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'centro_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_cuadrillas_0' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_cuadrillas_0' }])
  centroTrabajo!: Relation<CentroTrabajo>;
}

@Entity({ schema: 'asistencia_v2', name: 'asignaciones_centros' })
@Check('ck_asignaciones_centros_0', "vigente_hasta IS NULL OR vigente_hasta > vigente_desde")
@Exclusion('ex_asignaciones_centros_0', "USING gist (usuario_empresa_id WITH =, centro_id WITH =, tstzrange(vigente_desde, vigente_hasta, '[)') WITH &&) WHERE (is_active)")
export class AsignacionCentro extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'usuario_empresa_id', type: 'uuid' }) usuarioEmpresaId!: string;
  @Column({ name: 'centro_id', type: 'uuid' }) centroId!: string;
  @Column({ name: 'cuadrilla_id', type: 'uuid', nullable: true }) cuadrillaId!: string | null;
  @Column({ name: 'configuracion_id', type: 'uuid', nullable: true }) configuracionId!: string | null;
  @Column({ name: 'vigente_desde', type: 'timestamptz' }) vigenteDesde!: Date;
  @Column({ name: 'vigente_hasta', type: 'timestamptz', nullable: true }) vigenteHasta!: Date | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @ManyToOne(() => UsuarioEmpresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'usuario_empresa_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_asignaciones_centros_0' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_asignaciones_centros_0' }])
  usuarioEmpresa!: Relation<UsuarioEmpresa>;
  @ManyToOne(() => CentroTrabajo, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'centro_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_asignaciones_centros_1' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_asignaciones_centros_1' }])
  centroTrabajo!: Relation<CentroTrabajo>;
  @ManyToOne(() => Cuadrilla, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'cuadrilla_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_asignaciones_centros_2' }, { name: 'centro_id', referencedColumnName: 'centroId', foreignKeyConstraintName: 'fk_asignaciones_centros_2' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_asignaciones_centros_2' }])
  cuadrilla!: Relation<Cuadrilla> | null;
  @ManyToOne(() => ConfiguracionAsistencia, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'configuracion_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_asignaciones_centros_3' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_asignaciones_centros_3' }])
  configuracionAsistencia!: Relation<ConfiguracionAsistencia> | null;
}

@Entity({ schema: 'asistencia_v2', name: 'configuraciones_asistencia' })
@Unique('uq_configuraciones_asistencia_0', ["empresaId", "version"])
@Unique('uq_configuraciones_asistencia_1', ["id", "empresaId"])
@Check('ck_configuraciones_asistencia_0', "version > 0")
@Check('ck_configuraciones_asistencia_1', "tolerancia_entrada_seg >= 0")
@Check('ck_configuraciones_asistencia_2', "umbral_anticipacion_seg >= 0")
@Check('ck_configuraciones_asistencia_3', "tolerancia_salida_seg >= 0")
@Check('ck_configuraciones_asistencia_4', "margen_cercania_m >= 0 AND margen_cercania_m < 'Infinity'::float8")
@Check('ck_configuraciones_asistencia_5', "precision_maxima_m > 0 AND precision_maxima_m < 'Infinity'::float8")
export class ConfiguracionAsistencia extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'version', type: 'integer' }) version!: number;
  @Column({ name: 'nombre', type: 'text' }) nombre!: string;
  @Column({ name: 'tolerancia_entrada_seg', type: 'integer', default: 300 }) toleranciaEntradaSeg!: number;
  @Column({ name: 'umbral_anticipacion_seg', type: 'integer', default: 0 }) umbralAnticipacionSeg!: number;
  @Column({ name: 'tolerancia_salida_seg', type: 'integer', default: 0 }) toleranciaSalidaSeg!: number;
  @Column({ name: 'margen_cercania_m', type: 'double precision', default: 50 }) margenCercaniaM!: number;
  @Column({ name: 'precision_maxima_m', type: 'double precision', default: 50 }) precisionMaximaM!: number;
  @Column({ name: 'requiere_foto', type: 'boolean', default: false }) requiereFoto!: boolean;
  @Column({ name: 'requiere_ubicacion', type: 'boolean', default: true }) requiereUbicacion!: boolean;
  @ManyToOne(() => Empresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'empresa_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_configuraciones_asistencia_0' }])
  empresa!: Relation<Empresa>;
}

@Entity({ schema: 'asistencia_v2', name: 'geocercas' })
@Unique('uq_geocercas_0', ["centroId", "version"])
@Unique('uq_geocercas_1', ["centroId", "vigenteDesde"])
@Unique('uq_geocercas_2', ["id", "centroId", "empresaId"])
@Check('ck_geocercas_0', "version > 0")
@Check('ck_geocercas_1', "(centro IS NOT NULL AND radio_m IS NOT NULL AND radio_m > 0 AND radio_m < 'Infinity'::float8 AND poligono IS NULL) OR (centro IS NULL AND radio_m IS NULL AND poligono IS NOT NULL)")
@Check('ck_geocercas_2', "poligono IS NULL OR (ST_IsValid(poligono::geometry) AND NOT ST_IsEmpty(poligono::geometry))")
@Check('ck_geocercas_3', "centro IS NULL OR NOT ST_IsEmpty(centro::geometry)")
@Index('ix_geocercas_0', ["centro"], { spatial: true })
@Index('ix_geocercas_1', ["poligono"], { spatial: true })
export class Geocerca extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'centro_id', type: 'uuid' }) centroId!: string;
  @Column({ name: 'version', type: 'integer' }) version!: number;
  @Column({ name: 'vigente_desde', type: 'timestamptz' }) vigenteDesde!: Date;
  @Column({ name: 'centro', type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true }) centro!: Point | null;
  @Column({ name: 'radio_m', type: 'double precision', nullable: true }) radioM!: number | null;
  @Column({ name: 'poligono', type: 'geography', spatialFeatureType: 'Polygon', srid: 4326, nullable: true }) poligono!: Polygon | null;
  @ManyToOne(() => CentroTrabajo, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'centro_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_geocercas_0' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_geocercas_0' }])
  centroTrabajo!: Relation<CentroTrabajo>;
}

@Entity({ schema: 'asistencia_v2', name: 'horarios' })
@Unique('uq_horarios_0', ["empresaId", "nombre", "version"])
@Unique('uq_horarios_1', ["id", "empresaId"])
@Check('ck_horarios_0', "version > 0")
export class Horario extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'nombre', type: 'text' }) nombre!: string;
  @Column({ name: 'version', type: 'integer' }) version!: number;
  @Column({ name: 'zona_horaria', type: 'text', default: "America/Guatemala" }) zonaHoraria!: string;
  @ManyToOne(() => Empresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'empresa_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_horarios_0' }])
  empresa!: Relation<Empresa>;
}

@Entity({ schema: 'asistencia_v2', name: 'horario_detalles' })
@Unique('uq_horario_detalles_0', ["horarioId", "diaIso", "bloque"])
@Unique('uq_horario_detalles_1', ["id", "horarioId"])
@Check('ck_horario_detalles_0', "dia_iso BETWEEN 1 AND 7")
@Check('ck_horario_detalles_1', "bloque > 0")
@Check('ck_horario_detalles_2', "dias_fin IN (0,1)")
@Check('ck_horario_detalles_3', "(hora_fin - hora_inicio + dias_fin * interval '1 day') > interval '0' AND (hora_fin - hora_inicio + dias_fin * interval '1 day') <= interval '24 hours'")
export class HorarioDetalle extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'horario_id', type: 'uuid' }) horarioId!: string;
  @Column({ name: 'dia_iso', type: 'smallint' }) diaIso!: number;
  @Column({ name: 'bloque', type: 'smallint', default: 1 }) bloque!: number;
  @Column({ name: 'hora_inicio', type: 'time' }) horaInicio!: string;
  @Column({ name: 'hora_fin', type: 'time' }) horaFin!: string;
  @Column({ name: 'dias_fin', type: 'smallint', default: 0 }) diasFin!: number;
  @ManyToOne(() => Horario, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'horario_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_horario_detalles_0' }])
  horario!: Relation<Horario>;
}

@Entity({ schema: 'asistencia_v2', name: 'asignaciones_horario' })
@Unique('uq_asignaciones_horario_0', ["id", "usuarioEmpresaId", "empresaId", "horarioId", "configuracionId"])
@Check('ck_asignaciones_horario_0', "vigente_hasta IS NULL OR vigente_hasta > vigente_desde")
@Exclusion('ex_asignaciones_horario_0', "USING gist (usuario_empresa_id WITH =, daterange(vigente_desde, vigente_hasta, '[)') WITH &&) WHERE (is_active)")
export class AsignacionHorario extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'usuario_empresa_id', type: 'uuid' }) usuarioEmpresaId!: string;
  @Column({ name: 'horario_id', type: 'uuid' }) horarioId!: string;
  @Column({ name: 'configuracion_id', type: 'uuid' }) configuracionId!: string;
  @Column({ name: 'vigente_desde', type: 'date' }) vigenteDesde!: string;
  @Column({ name: 'vigente_hasta', type: 'date', nullable: true }) vigenteHasta!: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @ManyToOne(() => UsuarioEmpresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'usuario_empresa_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_asignaciones_horario_0' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_asignaciones_horario_0' }])
  usuarioEmpresa!: Relation<UsuarioEmpresa>;
  @ManyToOne(() => Horario, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'horario_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_asignaciones_horario_1' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_asignaciones_horario_1' }])
  horario!: Relation<Horario>;
  @ManyToOne(() => ConfiguracionAsistencia, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'configuracion_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_asignaciones_horario_2' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_asignaciones_horario_2' }])
  configuracionAsistencia!: Relation<ConfiguracionAsistencia>;
}

@Entity({ schema: 'asistencia_v2', name: 'jornadas' })
@Unique('uq_jornadas_0', ["usuarioEmpresaId", "horarioDetalleId", "fechaLaboral"])
@Unique('uq_jornadas_1', ["id", "usuarioEmpresaId", "empresaId"])
@Check('ck_jornadas_0', "fin_programado > inicio_programado")
@Exclusion('ex_jornadas_0', "USING gist (usuario_empresa_id WITH =, tstzrange(inicio_programado, fin_programado, '[)') WITH &&) WHERE (NOT cancelada)")
export class Jornada extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'usuario_empresa_id', type: 'uuid' }) usuarioEmpresaId!: string;
  @Column({ name: 'asignacion_horario_id', type: 'uuid' }) asignacionHorarioId!: string;
  @Column({ name: 'horario_id', type: 'uuid' }) horarioId!: string;
  @Column({ name: 'horario_detalle_id', type: 'uuid' }) horarioDetalleId!: string;
  @Column({ name: 'configuracion_id', type: 'uuid' }) configuracionId!: string;
  @Column({ name: 'fecha_laboral', type: 'date' }) fechaLaboral!: string;
  @Column({ name: 'inicio_programado', type: 'timestamptz' }) inicioProgramado!: Date;
  @Column({ name: 'fin_programado', type: 'timestamptz' }) finProgramado!: Date;
  @Column({ name: 'cancelada', type: 'boolean', default: false }) cancelada!: boolean;
  @ManyToOne(() => AsignacionHorario, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'asignacion_horario_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_jornadas_0' }, { name: 'usuario_empresa_id', referencedColumnName: 'usuarioEmpresaId', foreignKeyConstraintName: 'fk_jornadas_0' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_jornadas_0' }, { name: 'horario_id', referencedColumnName: 'horarioId', foreignKeyConstraintName: 'fk_jornadas_0' }, { name: 'configuracion_id', referencedColumnName: 'configuracionId', foreignKeyConstraintName: 'fk_jornadas_0' }])
  asignacionHorario!: Relation<AsignacionHorario>;
  @ManyToOne(() => HorarioDetalle, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'horario_detalle_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_jornadas_1' }, { name: 'horario_id', referencedColumnName: 'horarioId', foreignKeyConstraintName: 'fk_jornadas_1' }])
  horarioDetalle!: Relation<HorarioDetalle>;
}

@Entity({ schema: 'asistencia_v2', name: 'registros_asistencia' })
@Unique('uq_registros_asistencia_0', ["usuarioEmpresaId", "idEventoCliente"])
@Check('ck_registros_asistencia_0', "estado_evidencia IN ('COMPLETA','FALTA_FOTO','FALTA_UBICACION','FALTAN_AMBAS','NO_EVALUADO')")
@Check('ck_registros_asistencia_1', "evento IN ('ENTRADA','SALIDA','OTRO_LEGADO')")
@Check('ck_registros_asistencia_2', "fuente_hora IN ('SERVIDOR','DISPOSITIVO_VALIDADO','LEGADO')")
@Check('ck_registros_asistencia_3', "origen IN ('APP','LEGADO')")
@Check('ck_registros_asistencia_4', "estado_temporal IN ('ANTES','A_TIEMPO','TARDE','SIN_HORARIO','NO_EVALUADO')")
@Check('ck_registros_asistencia_5', "estado_ubicacion IN ('DENTRO','CERCA','LEJOS','IMPRECISA','SIN_UBICACION','SIN_GEOCERCA','NO_APLICA','NO_EVALUADO')")
@Check('ck_registros_asistencia_6', "precision_m IS NULL OR (precision_m >= 0 AND precision_m < 'Infinity'::float8)")
@Check('ck_registros_asistencia_7', "retraso_seg IS NULL OR retraso_seg >= 0")
@Check('ck_registros_asistencia_8', "distancia_fuera_m IS NULL OR (distancia_fuera_m >= 0 AND distancia_fuera_m < 'Infinity'::float8)")
@Check('ck_registros_asistencia_9', "geocerca_id IS NULL OR centro_id IS NOT NULL")
@Check('ck_registros_asistencia_10', "jornada_id IS NULL OR configuracion_id IS NOT NULL")
@Check('ck_registros_asistencia_11', "origen = 'LEGADO' OR (configuracion_id IS NOT NULL AND evento <> 'OTRO_LEGADO' AND fuente_hora <> 'LEGADO')")
@Check('ck_registros_asistencia_12', "ubicacion IS NULL OR NOT ST_IsEmpty(ubicacion::geometry)")
@Index('ix_registros_asistencia_0', ["empresaId", "fechaEfectiva"], {  })
@Index('ix_registros_asistencia_1', ["usuarioEmpresaId", "fechaEfectiva"], {  })
@Index('ix_registros_asistencia_2', ["centroId", "fechaEfectiva"], {  })
@Index('ix_registros_asistencia_3', ["jornadaId", "evento"], { unique: true, where: "jornada_id IS NOT NULL AND origen = 'APP'" })
export class RegistroAsistencia extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'usuario_empresa_id', type: 'uuid' }) usuarioEmpresaId!: string;
  @Column({ name: 'centro_id', type: 'uuid', nullable: true }) centroId!: string | null;
  @Column({ name: 'geocerca_id', type: 'uuid', nullable: true }) geocercaId!: string | null;
  @Column({ name: 'configuracion_id', type: 'uuid', nullable: true }) configuracionId!: string | null;
  @Column({ name: 'jornada_id', type: 'uuid', nullable: true }) jornadaId!: string | null;
  @Column({ name: 'evento', type: 'text' }) evento!: string;
  @Column({ name: 'id_evento_cliente', type: 'uuid' }) idEventoCliente!: string;
  @Column({ name: 'fecha_dispositivo', type: 'timestamptz', nullable: true }) fechaDispositivo!: Date | null;
  @Column({ name: 'fecha_servidor', type: 'timestamptz', default: () => "now()" }) fechaServidor!: Date;
  @Column({ name: 'fecha_efectiva', type: 'timestamptz' }) fechaEfectiva!: Date;
  @Column({ name: 'fuente_hora', type: 'text' }) fuenteHora!: string;
  @Column({ name: 'es_offline', type: 'boolean', default: false }) esOffline!: boolean;
  @Column({ name: 'ubicacion', type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true }) ubicacion!: Point | null;
  @Column({ name: 'precision_m', type: 'double precision', nullable: true }) precisionM!: number | null;
  @Column({ name: 'altitud_m', type: 'numeric', precision: 8, scale: 2, nullable: true }) altitudM!: string | null;
  @Column({ name: 'agente_dispositivo', type: 'text', nullable: true }) agenteDispositivo!: string | null;
  @Column({ name: 'direccion_ip', type: 'text', nullable: true }) direccionIp!: string | null;
  @Column({ name: 'url_foto', type: 'text', nullable: true }) urlFoto!: string | null;
  @Column({ name: 'estado_temporal', type: 'text', default: "NO_EVALUADO" }) estadoTemporal!: string;
  @Column({ name: 'estado_ubicacion', type: 'text', default: "NO_EVALUADO" }) estadoUbicacion!: string;
  @Column({ name: 'estado_evidencia', type: 'text', default: "NO_EVALUADO" }) estadoEvidencia!: string;
  @Column({ name: 'desfase_seg', type: 'integer', nullable: true }) desfaseSeg!: number | null;
  @Column({ name: 'retraso_seg', type: 'integer', nullable: true }) retrasoSeg!: number | null;
  @Column({ name: 'distancia_fuera_m', type: 'double precision', nullable: true }) distanciaFueraM!: number | null;
  @Column({ name: 'origen', type: 'text', insert: false, update: false, default: "APP" }) origen!: string;
  @ManyToOne(() => UsuarioEmpresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'usuario_empresa_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_registros_asistencia_0' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_registros_asistencia_0' }])
  usuarioEmpresa!: Relation<UsuarioEmpresa>;
  @ManyToOne(() => CentroTrabajo, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'centro_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_registros_asistencia_1' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_registros_asistencia_1' }])
  centroTrabajo!: Relation<CentroTrabajo> | null;
  @ManyToOne(() => Geocerca, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'geocerca_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_registros_asistencia_2' }, { name: 'centro_id', referencedColumnName: 'centroId', foreignKeyConstraintName: 'fk_registros_asistencia_2' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_registros_asistencia_2' }])
  geocerca!: Relation<Geocerca> | null;
  @ManyToOne(() => ConfiguracionAsistencia, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'configuracion_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_registros_asistencia_3' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_registros_asistencia_3' }])
  configuracionAsistencia!: Relation<ConfiguracionAsistencia> | null;
  @ManyToOne(() => Jornada, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'jornada_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_registros_asistencia_4' }, { name: 'usuario_empresa_id', referencedColumnName: 'usuarioEmpresaId', foreignKeyConstraintName: 'fk_registros_asistencia_4' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_registros_asistencia_4' }])
  jornada!: Relation<Jornada> | null;
}

@Entity({ schema: 'asistencia_v2', name: 'dispositivos' })
@Unique('uq_dispositivos_0', ["identificador"])
export class Dispositivo extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'usuario_id', type: 'uuid' }) usuarioId!: string;
  @Column({ name: 'identificador', type: 'text' }) identificador!: string;
  @Column({ name: 'plataforma', type: 'text' }) plataforma!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'usuario_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_dispositivos_0' }])
  usuario!: Relation<Usuario>;
}

@Entity({ schema: 'asistencia_v2', name: 'vehiculos' })
@Unique('uq_vehiculos_0', ["empresaId", "placa"])
@Unique('uq_vehiculos_1', ["id", "empresaId"])
export class Vehiculo extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'placa', type: 'text' }) placa!: string;
  @Column({ name: 'descripcion', type: 'text', nullable: true }) descripcion!: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @ManyToOne(() => Empresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'empresa_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_vehiculos_0' }])
  empresa!: Relation<Empresa>;
}

@Entity({ schema: 'asistencia_v2', name: 'viajes' })
@Check('ck_viajes_0', "estado IN ('EN_CURSO','FINALIZADO','CANCELADO','LEGADO')")
@Check('ck_viajes_1', "origen IN ('APP','LEGADO')")
@Check('ck_viajes_2', "fin_dispositivo IS NULL OR fin_dispositivo >= inicio_dispositivo")
@Check('ck_viajes_3', "fin_servidor IS NULL OR inicio_servidor IS NULL OR fin_servidor >= inicio_servidor")
@Check('ck_viajes_4', "origen = 'LEGADO' OR inicio_servidor IS NOT NULL")
@Check('ck_viajes_5', "origen = 'LEGADO' OR estado <> 'LEGADO'")
@Check('ck_viajes_6', "origen = 'LEGADO' OR estado <> 'FINALIZADO' OR (fin_dispositivo IS NOT NULL AND fin_servidor IS NOT NULL)")
@Check('ck_viajes_7', "revision_datos >= 0 AND revision_ruta >= 0 AND revision_ruta <= revision_datos")
@Index('ix_viajes_0', ["pilotoMembresiaId"], { unique: true, where: "estado = 'EN_CURSO'" })
@Index('ix_viajes_1', ["empresaId", "inicioDispositivo"], {  })
export class Viaje extends AuditColumns {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id!: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId!: string;
  @Column({ name: 'piloto_membresia_id', type: 'uuid' }) pilotoMembresiaId!: string;
  @Column({ name: 'dispositivo_id', type: 'uuid', nullable: true }) dispositivoId!: string | null;
  @Column({ name: 'vehiculo_id', type: 'uuid', nullable: true }) vehiculoId!: string | null;
  @Column({ name: 'centro_origen_id', type: 'uuid', nullable: true }) centroOrigenId!: string | null;
  @Column({ name: 'centro_destino_id', type: 'uuid', nullable: true }) centroDestinoId!: string | null;
  @Column({ name: 'estado', type: 'text', default: "EN_CURSO" }) estado!: string;
  @Column({ name: 'inicio_dispositivo', type: 'timestamptz' }) inicioDispositivo!: Date;
  @Column({ name: 'inicio_servidor', type: 'timestamptz', nullable: true }) inicioServidor!: Date | null;
  @Column({ name: 'fin_dispositivo', type: 'timestamptz', nullable: true }) finDispositivo!: Date | null;
  @Column({ name: 'fin_servidor', type: 'timestamptz', nullable: true }) finServidor!: Date | null;
  @Column({ name: 'revision_datos', type: 'bigint', default: 0 }) revisionDatos!: string;
  @Column({ name: 'revision_ruta', type: 'bigint', default: 0 }) revisionRuta!: string;
  @Column({ name: 'origen', type: 'text', insert: false, update: false, default: "APP" }) origen!: string;
  @ManyToOne(() => UsuarioEmpresa, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'piloto_membresia_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_viajes_0' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_viajes_0' }])
  piloto!: Relation<UsuarioEmpresa>;
  @ManyToOne(() => Dispositivo, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'dispositivo_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_viajes_1' }])
  dispositivo!: Relation<Dispositivo> | null;
  @ManyToOne(() => Vehiculo, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'vehiculo_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_viajes_2' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_viajes_2' }])
  vehiculo!: Relation<Vehiculo> | null;
  @ManyToOne(() => CentroTrabajo, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'centro_origen_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_viajes_3' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_viajes_3' }])
  centroOrigen!: Relation<CentroTrabajo> | null;
  @ManyToOne(() => CentroTrabajo, { nullable: true, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'centro_destino_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_viajes_4' }, { name: 'empresa_id', referencedColumnName: 'empresaId', foreignKeyConstraintName: 'fk_viajes_4' }])
  centroDestino!: Relation<CentroTrabajo> | null;
}

@Entity({ schema: 'asistencia_v2', name: 'puntos_viaje' })
@Check('ck_puntos_viaje_0', "secuencia >= 0")
@Check('ck_puntos_viaje_1', "calidad IN ('PENDIENTE','VALIDO','IMPRECISO','DESCARTADO','LEGADO')")
@Check('ck_puntos_viaje_2', "origen IN ('APP','LEGADO')")
@Check('ck_puntos_viaje_3', "origen = 'LEGADO' OR fecha_dispositivo IS NOT NULL")
@Check('ck_puntos_viaje_4', "precision_m IS NULL OR (precision_m >= 0 AND precision_m < 'Infinity'::float8)")
@Check('ck_puntos_viaje_5', "NOT ST_IsEmpty(geom) AND ST_X(geom) BETWEEN -180 AND 180 AND ST_Y(geom) BETWEEN -90 AND 90")
@Index('ix_puntos_viaje_0', ["viajeId", "fechaDispositivo", "secuencia"], {  })
export class PuntoViaje extends AuditColumns {
  @PrimaryColumn({ name: 'viaje_id', type: 'uuid' }) viajeId!: string;
  @PrimaryColumn({ name: 'secuencia', type: 'bigint' }) secuencia!: string;
  @Column({ name: 'fecha_dispositivo', type: 'timestamptz', nullable: true }) fechaDispositivo!: Date | null;
  @Column({ name: 'fecha_servidor', type: 'timestamptz', default: () => "now()" }) fechaServidor!: Date;
  @Column({ name: 'geom', type: 'geometry', spatialFeatureType: 'Point', srid: 4326 }) geom!: Point;
  @Column({ name: 'precision_m', type: 'double precision', nullable: true }) precisionM!: number | null;
  @Column({ name: 'calidad', type: 'text', default: "PENDIENTE" }) calidad!: string;
  @Column({ name: 'origen', type: 'text', insert: false, update: false, default: "APP" }) origen!: string;
  @ManyToOne(() => Viaje, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'viaje_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_puntos_viaje_0' }])
  viaje!: Relation<Viaje>;
}

@Entity({ schema: 'asistencia_v2', name: 'segmentos_viaje' })
@Check('ck_segmentos_viaje_0', "numero >= 0")
@Check('ck_segmentos_viaje_1', "revision_origen >= 0")
@Check('ck_segmentos_viaje_2', "distancia_m >= 0 AND distancia_m < 'Infinity'::float8")
@Check('ck_segmentos_viaje_3', "NOT ST_IsEmpty(geom) AND ST_NPoints(geom) >= 2")
export class SegmentoViaje extends AuditColumns {
  @PrimaryColumn({ name: 'viaje_id', type: 'uuid' }) viajeId!: string;
  @PrimaryColumn({ name: 'numero', type: 'integer' }) numero!: number;
  @PrimaryColumn({ name: 'revision_origen', type: 'bigint' }) revisionOrigen!: string;
  @Column({ name: 'geom', type: 'geometry', spatialFeatureType: 'LineString', srid: 4326 }) geom!: LineString;
  @Column({ name: 'distancia_m', type: 'double precision' }) distanciaM!: number;
  @ManyToOne(() => Viaje, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'RESTRICT', cascade: false })
  @JoinColumn([{ name: 'viaje_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_segmentos_viaje_0' }])
  viaje!: Relation<Viaje>;
}

export const asistenciaEntities = [Empresa, Rol, Usuario, UsuarioEmpresa, CentroTrabajo, Cuadrilla, AsignacionCentro, ConfiguracionAsistencia, Geocerca, Horario, HorarioDetalle, AsignacionHorario, Jornada, RegistroAsistencia, Dispositivo, Vehiculo, Viaje, PuntoViaje, SegmentoViaje];