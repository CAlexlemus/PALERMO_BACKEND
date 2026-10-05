-- Propuesta para esquema NUEVO. Ejecutar primero en una copia. No modifica public.
BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA asistencia_v2;
SET LOCAL search_path = asistencia_v2, public;

CREATE TABLE empresas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  zona_horaria text NOT NULL DEFAULT 'America/Guatemala',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id)
);

CREATE TABLE roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT uq_roles_0 UNIQUE (nombre)
);

CREATE TABLE usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre_usuario text NOT NULL,
  contrasena_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_0 UNIQUE (nombre_usuario)
);

CREATE TABLE usuario_empresas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  rol_id uuid NOT NULL,
  jefe_membresia_id uuid,
  vigente_desde timestamptz NOT NULL DEFAULT now(),
  vigente_hasta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT uq_usuario_empresas_0 UNIQUE (usuario_id, empresa_id),
  CONSTRAINT uq_usuario_empresas_1 UNIQUE (id, empresa_id),
  CONSTRAINT ck_usuario_empresas_0 CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde),
  CONSTRAINT ck_usuario_empresas_1 CHECK (jefe_membresia_id IS NULL OR jefe_membresia_id <> id)
);

CREATE TABLE centros_trabajo (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nombre text NOT NULL,
  tipo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT uq_centros_trabajo_0 UNIQUE (id, empresa_id),
  CONSTRAINT ck_centros_trabajo_0 CHECK (tipo IN ('OBRA','OFICINA','BASE','OTRO'))
);

CREATE TABLE cuadrillas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  centro_id uuid NOT NULL,
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT uq_cuadrillas_0 UNIQUE (id, centro_id, empresa_id)
);

CREATE TABLE asignaciones_centros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  usuario_empresa_id uuid NOT NULL,
  centro_id uuid NOT NULL,
  cuadrilla_id uuid,
  configuracion_id uuid,
  vigente_desde timestamptz NOT NULL,
  vigente_hasta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT ck_asignaciones_centros_0 CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde)
);

CREATE TABLE configuraciones_asistencia (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  version integer NOT NULL,
  nombre text NOT NULL,
  tolerancia_entrada_seg integer NOT NULL DEFAULT 300,
  umbral_anticipacion_seg integer NOT NULL DEFAULT 0,
  tolerancia_salida_seg integer NOT NULL DEFAULT 0,
  margen_cercania_m double precision NOT NULL DEFAULT 50,
  precision_maxima_m double precision NOT NULL DEFAULT 50,
  requiere_foto boolean NOT NULL DEFAULT false,
  requiere_ubicacion boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT uq_configuraciones_asistencia_0 UNIQUE (empresa_id, version),
  CONSTRAINT uq_configuraciones_asistencia_1 UNIQUE (id, empresa_id),
  CONSTRAINT ck_configuraciones_asistencia_0 CHECK (version > 0),
  CONSTRAINT ck_configuraciones_asistencia_1 CHECK (tolerancia_entrada_seg >= 0),
  CONSTRAINT ck_configuraciones_asistencia_2 CHECK (umbral_anticipacion_seg >= 0),
  CONSTRAINT ck_configuraciones_asistencia_3 CHECK (tolerancia_salida_seg >= 0),
  CONSTRAINT ck_configuraciones_asistencia_4 CHECK (margen_cercania_m >= 0 AND margen_cercania_m < 'Infinity'::float8),
  CONSTRAINT ck_configuraciones_asistencia_5 CHECK (precision_maxima_m > 0 AND precision_maxima_m < 'Infinity'::float8)
);

CREATE TABLE geocercas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  centro_id uuid NOT NULL,
  version integer NOT NULL,
  vigente_desde timestamptz NOT NULL,
  centro geography(Point,4326),
  radio_m double precision,
  poligono geography(Polygon,4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT uq_geocercas_0 UNIQUE (centro_id, version),
  CONSTRAINT uq_geocercas_1 UNIQUE (centro_id, vigente_desde),
  CONSTRAINT uq_geocercas_2 UNIQUE (id, centro_id, empresa_id),
  CONSTRAINT ck_geocercas_0 CHECK (version > 0),
  CONSTRAINT ck_geocercas_1 CHECK ((centro IS NOT NULL AND radio_m IS NOT NULL AND radio_m > 0 AND radio_m < 'Infinity'::float8 AND poligono IS NULL) OR (centro IS NULL AND radio_m IS NULL AND poligono IS NOT NULL)),
  CONSTRAINT ck_geocercas_2 CHECK (poligono IS NULL OR (ST_IsValid(poligono::geometry) AND NOT ST_IsEmpty(poligono::geometry))),
  CONSTRAINT ck_geocercas_3 CHECK (centro IS NULL OR NOT ST_IsEmpty(centro::geometry))
);

CREATE TABLE horarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nombre text NOT NULL,
  version integer NOT NULL,
  zona_horaria text NOT NULL DEFAULT 'America/Guatemala',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT uq_horarios_0 UNIQUE (empresa_id, nombre, version),
  CONSTRAINT uq_horarios_1 UNIQUE (id, empresa_id),
  CONSTRAINT ck_horarios_0 CHECK (version > 0)
);

CREATE TABLE horario_detalles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  horario_id uuid NOT NULL,
  dia_iso smallint NOT NULL,
  bloque smallint NOT NULL DEFAULT 1,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  dias_fin smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT uq_horario_detalles_0 UNIQUE (horario_id, dia_iso, bloque),
  CONSTRAINT uq_horario_detalles_1 UNIQUE (id, horario_id),
  CONSTRAINT ck_horario_detalles_0 CHECK (dia_iso BETWEEN 1 AND 7),
  CONSTRAINT ck_horario_detalles_1 CHECK (bloque > 0),
  CONSTRAINT ck_horario_detalles_2 CHECK (dias_fin IN (0,1)),
  CONSTRAINT ck_horario_detalles_3 CHECK ((hora_fin - hora_inicio + dias_fin * interval '1 day') > interval '0' AND (hora_fin - hora_inicio + dias_fin * interval '1 day') <= interval '24 hours')
);

CREATE TABLE asignaciones_horario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  usuario_empresa_id uuid NOT NULL,
  horario_id uuid NOT NULL,
  configuracion_id uuid NOT NULL,
  vigente_desde date NOT NULL,
  vigente_hasta date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT uq_asignaciones_horario_0 UNIQUE (id, usuario_empresa_id, empresa_id, horario_id, configuracion_id),
  CONSTRAINT ck_asignaciones_horario_0 CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde)
);

CREATE TABLE jornadas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  usuario_empresa_id uuid NOT NULL,
  asignacion_horario_id uuid NOT NULL,
  horario_id uuid NOT NULL,
  horario_detalle_id uuid NOT NULL,
  configuracion_id uuid NOT NULL,
  fecha_laboral date NOT NULL,
  inicio_programado timestamptz NOT NULL,
  fin_programado timestamptz NOT NULL,
  cancelada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT uq_jornadas_0 UNIQUE (usuario_empresa_id, horario_detalle_id, fecha_laboral),
  CONSTRAINT uq_jornadas_1 UNIQUE (id, usuario_empresa_id, empresa_id),
  CONSTRAINT ck_jornadas_0 CHECK (fin_programado > inicio_programado)
);

CREATE TABLE registros_asistencia (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  usuario_empresa_id uuid NOT NULL,
  centro_id uuid,
  geocerca_id uuid,
  configuracion_id uuid,
  jornada_id uuid,
  evento text NOT NULL,
  id_evento_cliente uuid NOT NULL,
  fecha_dispositivo timestamptz,
  fecha_servidor timestamptz NOT NULL DEFAULT now(),
  fecha_efectiva timestamptz NOT NULL,
  fuente_hora text NOT NULL,
  es_offline boolean NOT NULL DEFAULT false,
  ubicacion geography(Point,4326),
  precision_m double precision,
  altitud_m numeric(8,2),
  agente_dispositivo text,
  direccion_ip text,
  url_foto text,
  estado_temporal text NOT NULL DEFAULT 'NO_EVALUADO',
  estado_ubicacion text NOT NULL DEFAULT 'NO_EVALUADO',
  estado_evidencia text NOT NULL DEFAULT 'NO_EVALUADO',
  desfase_seg integer,
  retraso_seg integer,
  distancia_fuera_m double precision,
  origen text NOT NULL DEFAULT 'APP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT uq_registros_asistencia_0 UNIQUE (usuario_empresa_id, id_evento_cliente),
  CONSTRAINT ck_registros_asistencia_0 CHECK (estado_evidencia IN ('COMPLETA','FALTA_FOTO','FALTA_UBICACION','FALTAN_AMBAS','NO_EVALUADO')),
  CONSTRAINT ck_registros_asistencia_1 CHECK (evento IN ('ENTRADA','SALIDA','OTRO_LEGADO')),
  CONSTRAINT ck_registros_asistencia_2 CHECK (fuente_hora IN ('SERVIDOR','DISPOSITIVO_VALIDADO','LEGADO')),
  CONSTRAINT ck_registros_asistencia_3 CHECK (origen IN ('APP','LEGADO')),
  CONSTRAINT ck_registros_asistencia_4 CHECK (estado_temporal IN ('ANTES','A_TIEMPO','TARDE','SIN_HORARIO','NO_EVALUADO')),
  CONSTRAINT ck_registros_asistencia_5 CHECK (estado_ubicacion IN ('DENTRO','CERCA','LEJOS','IMPRECISA','SIN_UBICACION','SIN_GEOCERCA','NO_APLICA','NO_EVALUADO')),
  CONSTRAINT ck_registros_asistencia_6 CHECK (precision_m IS NULL OR (precision_m >= 0 AND precision_m < 'Infinity'::float8)),
  CONSTRAINT ck_registros_asistencia_7 CHECK (retraso_seg IS NULL OR retraso_seg >= 0),
  CONSTRAINT ck_registros_asistencia_8 CHECK (distancia_fuera_m IS NULL OR (distancia_fuera_m >= 0 AND distancia_fuera_m < 'Infinity'::float8)),
  CONSTRAINT ck_registros_asistencia_9 CHECK (geocerca_id IS NULL OR centro_id IS NOT NULL),
  CONSTRAINT ck_registros_asistencia_10 CHECK (jornada_id IS NULL OR configuracion_id IS NOT NULL),
  CONSTRAINT ck_registros_asistencia_11 CHECK (origen = 'LEGADO' OR (configuracion_id IS NOT NULL AND evento <> 'OTRO_LEGADO' AND fuente_hora <> 'LEGADO')),
  CONSTRAINT ck_registros_asistencia_12 CHECK (ubicacion IS NULL OR NOT ST_IsEmpty(ubicacion::geometry))
);

CREATE TABLE dispositivos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  identificador text NOT NULL,
  plataforma text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT uq_dispositivos_0 UNIQUE (identificador)
);

CREATE TABLE vehiculos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  placa text NOT NULL,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  CONSTRAINT uq_vehiculos_0 UNIQUE (empresa_id, placa),
  CONSTRAINT uq_vehiculos_1 UNIQUE (id, empresa_id)
);

CREATE TABLE viajes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  piloto_membresia_id uuid NOT NULL,
  dispositivo_id uuid,
  vehiculo_id uuid,
  centro_origen_id uuid,
  centro_destino_id uuid,
  estado text NOT NULL DEFAULT 'EN_CURSO',
  inicio_dispositivo timestamptz NOT NULL,
  inicio_servidor timestamptz,
  fin_dispositivo timestamptz,
  fin_servidor timestamptz,
  revision_datos bigint NOT NULL DEFAULT 0,
  revision_ruta bigint NOT NULL DEFAULT 0,
  origen text NOT NULL DEFAULT 'APP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT ck_viajes_0 CHECK (estado IN ('EN_CURSO','FINALIZADO','CANCELADO','LEGADO')),
  CONSTRAINT ck_viajes_1 CHECK (origen IN ('APP','LEGADO')),
  CONSTRAINT ck_viajes_2 CHECK (fin_dispositivo IS NULL OR fin_dispositivo >= inicio_dispositivo),
  CONSTRAINT ck_viajes_3 CHECK (fin_servidor IS NULL OR inicio_servidor IS NULL OR fin_servidor >= inicio_servidor),
  CONSTRAINT ck_viajes_4 CHECK (origen = 'LEGADO' OR inicio_servidor IS NOT NULL),
  CONSTRAINT ck_viajes_5 CHECK (origen = 'LEGADO' OR estado <> 'LEGADO'),
  CONSTRAINT ck_viajes_6 CHECK (origen = 'LEGADO' OR estado <> 'FINALIZADO' OR (fin_dispositivo IS NOT NULL AND fin_servidor IS NOT NULL)),
  CONSTRAINT ck_viajes_7 CHECK (revision_datos >= 0 AND revision_ruta >= 0 AND revision_ruta <= revision_datos)
);

CREATE TABLE puntos_viaje (
  viaje_id uuid NOT NULL,
  secuencia bigint NOT NULL,
  fecha_dispositivo timestamptz,
  fecha_servidor timestamptz NOT NULL DEFAULT now(),
  geom geometry(Point,4326) NOT NULL,
  precision_m double precision,
  calidad text NOT NULL DEFAULT 'PENDIENTE',
  origen text NOT NULL DEFAULT 'APP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (viaje_id, secuencia),
  CONSTRAINT ck_puntos_viaje_0 CHECK (secuencia >= 0),
  CONSTRAINT ck_puntos_viaje_1 CHECK (calidad IN ('PENDIENTE','VALIDO','IMPRECISO','DESCARTADO','LEGADO')),
  CONSTRAINT ck_puntos_viaje_2 CHECK (origen IN ('APP','LEGADO')),
  CONSTRAINT ck_puntos_viaje_3 CHECK (origen = 'LEGADO' OR fecha_dispositivo IS NOT NULL),
  CONSTRAINT ck_puntos_viaje_4 CHECK (precision_m IS NULL OR (precision_m >= 0 AND precision_m < 'Infinity'::float8)),
  CONSTRAINT ck_puntos_viaje_5 CHECK (NOT ST_IsEmpty(geom) AND ST_X(geom) BETWEEN -180 AND 180 AND ST_Y(geom) BETWEEN -90 AND 90)
);

CREATE TABLE segmentos_viaje (
  viaje_id uuid NOT NULL,
  numero integer NOT NULL,
  revision_origen bigint NOT NULL,
  geom geometry(LineString,4326) NOT NULL,
  distancia_m double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (viaje_id, numero, revision_origen),
  CONSTRAINT ck_segmentos_viaje_0 CHECK (numero >= 0),
  CONSTRAINT ck_segmentos_viaje_1 CHECK (revision_origen >= 0),
  CONSTRAINT ck_segmentos_viaje_2 CHECK (distancia_m >= 0 AND distancia_m < 'Infinity'::float8),
  CONSTRAINT ck_segmentos_viaje_3 CHECK (NOT ST_IsEmpty(geom) AND ST_NPoints(geom) >= 2)
);

ALTER TABLE usuario_empresas ADD CONSTRAINT fk_usuario_empresas_0 FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE usuario_empresas ADD CONSTRAINT fk_usuario_empresas_1 FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_usuario_empresas_1 ON usuario_empresas (empresa_id);

ALTER TABLE usuario_empresas ADD CONSTRAINT fk_usuario_empresas_2 FOREIGN KEY (rol_id) REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_usuario_empresas_2 ON usuario_empresas (rol_id);

ALTER TABLE usuario_empresas ADD CONSTRAINT fk_usuario_empresas_3 FOREIGN KEY (jefe_membresia_id, empresa_id) REFERENCES usuario_empresas (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_usuario_empresas_3 ON usuario_empresas (jefe_membresia_id, empresa_id);

ALTER TABLE centros_trabajo ADD CONSTRAINT fk_centros_trabajo_0 FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_centros_trabajo_0 ON centros_trabajo (empresa_id);

ALTER TABLE cuadrillas ADD CONSTRAINT fk_cuadrillas_0 FOREIGN KEY (centro_id, empresa_id) REFERENCES centros_trabajo (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_cuadrillas_0 ON cuadrillas (centro_id, empresa_id);

ALTER TABLE asignaciones_centros ADD CONSTRAINT fk_asignaciones_centros_0 FOREIGN KEY (usuario_empresa_id, empresa_id) REFERENCES usuario_empresas (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_asignaciones_centros_0 ON asignaciones_centros (usuario_empresa_id, empresa_id);

ALTER TABLE asignaciones_centros ADD CONSTRAINT fk_asignaciones_centros_1 FOREIGN KEY (centro_id, empresa_id) REFERENCES centros_trabajo (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_asignaciones_centros_1 ON asignaciones_centros (centro_id, empresa_id);

ALTER TABLE asignaciones_centros ADD CONSTRAINT fk_asignaciones_centros_2 FOREIGN KEY (cuadrilla_id, centro_id, empresa_id) REFERENCES cuadrillas (id, centro_id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_asignaciones_centros_2 ON asignaciones_centros (cuadrilla_id, centro_id, empresa_id);

ALTER TABLE asignaciones_centros ADD CONSTRAINT fk_asignaciones_centros_3 FOREIGN KEY (configuracion_id, empresa_id) REFERENCES configuraciones_asistencia (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_asignaciones_centros_3 ON asignaciones_centros (configuracion_id, empresa_id);

ALTER TABLE asignaciones_centros ADD CONSTRAINT ex_asignaciones_centros_0 EXCLUDE USING gist (usuario_empresa_id WITH =, centro_id WITH =, tstzrange(vigente_desde, vigente_hasta, '[)') WITH &&) WHERE (is_active);

ALTER TABLE configuraciones_asistencia ADD CONSTRAINT fk_configuraciones_asistencia_0 FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE geocercas ADD CONSTRAINT fk_geocercas_0 FOREIGN KEY (centro_id, empresa_id) REFERENCES centros_trabajo (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_geocercas_0 ON geocercas (centro_id, empresa_id);

CREATE INDEX ix_geocercas_0 ON geocercas USING gist (centro);

CREATE INDEX ix_geocercas_1 ON geocercas USING gist (poligono);

ALTER TABLE horarios ADD CONSTRAINT fk_horarios_0 FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE horario_detalles ADD CONSTRAINT fk_horario_detalles_0 FOREIGN KEY (horario_id) REFERENCES horarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE asignaciones_horario ADD CONSTRAINT fk_asignaciones_horario_0 FOREIGN KEY (usuario_empresa_id, empresa_id) REFERENCES usuario_empresas (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_asignaciones_horario_0 ON asignaciones_horario (usuario_empresa_id, empresa_id);

ALTER TABLE asignaciones_horario ADD CONSTRAINT fk_asignaciones_horario_1 FOREIGN KEY (horario_id, empresa_id) REFERENCES horarios (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_asignaciones_horario_1 ON asignaciones_horario (horario_id, empresa_id);

ALTER TABLE asignaciones_horario ADD CONSTRAINT fk_asignaciones_horario_2 FOREIGN KEY (configuracion_id, empresa_id) REFERENCES configuraciones_asistencia (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_asignaciones_horario_2 ON asignaciones_horario (configuracion_id, empresa_id);

ALTER TABLE asignaciones_horario ADD CONSTRAINT ex_asignaciones_horario_0 EXCLUDE USING gist (usuario_empresa_id WITH =, daterange(vigente_desde, vigente_hasta, '[)') WITH &&) WHERE (is_active);

ALTER TABLE jornadas ADD CONSTRAINT fk_jornadas_0 FOREIGN KEY (asignacion_horario_id, usuario_empresa_id, empresa_id, horario_id, configuracion_id) REFERENCES asignaciones_horario (id, usuario_empresa_id, empresa_id, horario_id, configuracion_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_jornadas_0 ON jornadas (asignacion_horario_id, usuario_empresa_id, empresa_id, horario_id, configuracion_id);

ALTER TABLE jornadas ADD CONSTRAINT fk_jornadas_1 FOREIGN KEY (horario_detalle_id, horario_id) REFERENCES horario_detalles (id, horario_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_jornadas_1 ON jornadas (horario_detalle_id, horario_id);

ALTER TABLE jornadas ADD CONSTRAINT ex_jornadas_0 EXCLUDE USING gist (usuario_empresa_id WITH =, tstzrange(inicio_programado, fin_programado, '[)') WITH &&) WHERE (NOT cancelada);

ALTER TABLE registros_asistencia ADD CONSTRAINT fk_registros_asistencia_0 FOREIGN KEY (usuario_empresa_id, empresa_id) REFERENCES usuario_empresas (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_registros_asistencia_0 ON registros_asistencia (usuario_empresa_id, empresa_id);

ALTER TABLE registros_asistencia ADD CONSTRAINT fk_registros_asistencia_1 FOREIGN KEY (centro_id, empresa_id) REFERENCES centros_trabajo (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_registros_asistencia_1 ON registros_asistencia (centro_id, empresa_id);

ALTER TABLE registros_asistencia ADD CONSTRAINT fk_registros_asistencia_2 FOREIGN KEY (geocerca_id, centro_id, empresa_id) REFERENCES geocercas (id, centro_id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_registros_asistencia_2 ON registros_asistencia (geocerca_id, centro_id, empresa_id);

ALTER TABLE registros_asistencia ADD CONSTRAINT fk_registros_asistencia_3 FOREIGN KEY (configuracion_id, empresa_id) REFERENCES configuraciones_asistencia (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_registros_asistencia_3 ON registros_asistencia (configuracion_id, empresa_id);

ALTER TABLE registros_asistencia ADD CONSTRAINT fk_registros_asistencia_4 FOREIGN KEY (jornada_id, usuario_empresa_id, empresa_id) REFERENCES jornadas (id, usuario_empresa_id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_registros_asistencia_4 ON registros_asistencia (jornada_id, usuario_empresa_id, empresa_id);

CREATE INDEX ix_registros_asistencia_0 ON registros_asistencia USING btree (empresa_id, fecha_efectiva);

CREATE INDEX ix_registros_asistencia_1 ON registros_asistencia USING btree (usuario_empresa_id, fecha_efectiva);

CREATE INDEX ix_registros_asistencia_2 ON registros_asistencia USING btree (centro_id, fecha_efectiva);

CREATE UNIQUE INDEX ix_registros_asistencia_3 ON registros_asistencia USING btree (jornada_id, evento) WHERE jornada_id IS NOT NULL AND origen = 'APP';

ALTER TABLE dispositivos ADD CONSTRAINT fk_dispositivos_0 FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_dispositivos_0 ON dispositivos (usuario_id);

ALTER TABLE vehiculos ADD CONSTRAINT fk_vehiculos_0 FOREIGN KEY (empresa_id) REFERENCES empresas (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE viajes ADD CONSTRAINT fk_viajes_0 FOREIGN KEY (piloto_membresia_id, empresa_id) REFERENCES usuario_empresas (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_viajes_0 ON viajes (piloto_membresia_id, empresa_id);

ALTER TABLE viajes ADD CONSTRAINT fk_viajes_1 FOREIGN KEY (dispositivo_id) REFERENCES dispositivos (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_viajes_1 ON viajes (dispositivo_id);

ALTER TABLE viajes ADD CONSTRAINT fk_viajes_2 FOREIGN KEY (vehiculo_id, empresa_id) REFERENCES vehiculos (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_viajes_2 ON viajes (vehiculo_id, empresa_id);

ALTER TABLE viajes ADD CONSTRAINT fk_viajes_3 FOREIGN KEY (centro_origen_id, empresa_id) REFERENCES centros_trabajo (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_viajes_3 ON viajes (centro_origen_id, empresa_id);

ALTER TABLE viajes ADD CONSTRAINT fk_viajes_4 FOREIGN KEY (centro_destino_id, empresa_id) REFERENCES centros_trabajo (id, empresa_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_fk_viajes_4 ON viajes (centro_destino_id, empresa_id);

CREATE UNIQUE INDEX ix_viajes_0 ON viajes USING btree (piloto_membresia_id) WHERE estado = 'EN_CURSO';

CREATE INDEX ix_viajes_1 ON viajes USING btree (empresa_id, inicio_dispositivo);

ALTER TABLE puntos_viaje ADD CONSTRAINT fk_puntos_viaje_0 FOREIGN KEY (viaje_id) REFERENCES viajes (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX ix_puntos_viaje_0 ON puntos_viaje USING btree (viaje_id, fecha_dispositivo, secuencia);

ALTER TABLE segmentos_viaje ADD CONSTRAINT fk_segmentos_viaje_0 FOREIGN KEY (viaje_id) REFERENCES viajes (id) ON DELETE RESTRICT ON UPDATE RESTRICT;


CREATE FUNCTION asistencia_v2.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = clock_timestamp(); RETURN NEW; END $$;
CREATE FUNCTION asistencia_v2.proteger_version() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Registro histórico inmutable: cree una versión nueva'; END $$;


CREATE TRIGGER trg_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON usuario_empresas FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON centros_trabajo FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON cuadrillas FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON asignaciones_centros FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_inmutable BEFORE UPDATE OR DELETE ON configuraciones_asistencia FOR EACH ROW EXECUTE FUNCTION asistencia_v2.proteger_version();

CREATE TRIGGER trg_inmutable BEFORE UPDATE OR DELETE ON geocercas FOR EACH ROW EXECUTE FUNCTION asistencia_v2.proteger_version();

CREATE TRIGGER trg_inmutable BEFORE UPDATE OR DELETE ON horarios FOR EACH ROW EXECUTE FUNCTION asistencia_v2.proteger_version();

CREATE TRIGGER trg_inmutable BEFORE UPDATE OR DELETE ON horario_detalles FOR EACH ROW EXECUTE FUNCTION asistencia_v2.proteger_version();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON asignaciones_horario FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON jornadas FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_inmutable BEFORE UPDATE OR DELETE ON registros_asistencia FOR EACH ROW EXECUTE FUNCTION asistencia_v2.proteger_version();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON dispositivos FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON vehiculos FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON viajes FOR EACH ROW EXECUTE FUNCTION asistencia_v2.touch_updated_at();

CREATE TRIGGER trg_inmutable BEFORE UPDATE OR DELETE ON puntos_viaje FOR EACH ROW EXECUTE FUNCTION asistencia_v2.proteger_version();

CREATE TRIGGER trg_inmutable BEFORE UPDATE OR DELETE ON segmentos_viaje FOR EACH ROW EXECUTE FUNCTION asistencia_v2.proteger_version();

COMMIT;
