-- DDL completo del módulo de rastreo de rutas (catálogos + viajes).
-- Tablas nuevas en public con un solo nombre (sin schema tracking).
-- Requiere que existan: usuarios, obras.
-- Ejecutar con: npm run db:migrate:tracking

--CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS empresas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre varchar(150) NOT NULL,
    vigente boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS dispositivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresaid uuid NOT NULL REFERENCES empresas(id),
    pilotid uuid NOT NULL REFERENCES usuarios(id),
    identificador varchar(100) NOT NULL,
    plataforma varchar(30) NOT NULL,
    vigente boolean NOT NULL DEFAULT true,
    CONSTRAINT uq_dispositivos_identificador UNIQUE (identificador)
);

CREATE TABLE IF NOT EXISTS vehiculos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresaid uuid NOT NULL REFERENCES empresas(id),
    placa varchar(20) NOT NULL,
    descripcion varchar(200),
    vigente boolean NOT NULL DEFAULT true
);

-- Enlace de empresa en tablas existentes
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS empresaid uuid REFERENCES empresas(id);

ALTER TABLE obras
    ADD COLUMN IF NOT EXISTS empresaid uuid REFERENCES empresas(id);

-- ---------------------------------------------------------------------------
-- Viajes y evidencia GPS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS viajes (
    id uuid PRIMARY KEY,
    empresa_id uuid NOT NULL REFERENCES empresas(id),
    piloto_id uuid NOT NULL REFERENCES usuarios(id),
    obra_destino_id uuid NOT NULL REFERENCES obras(id),
    dispositivo_id uuid NOT NULL REFERENCES dispositivos(id),
    vehiculo_id uuid REFERENCES vehiculos(id),
    estado text NOT NULL DEFAULT 'EN_CURSO'
        CHECK (estado IN (
            'EN_CURSO', 'SINCRONIZANDO', 'FINALIZADO',
            'INCOMPLETO', 'CANCELADO'
        )),
    inicio_dispositivo timestamptz NOT NULL,
    fin_dispositivo timestamptz,
    creado_servidor timestamptz NOT NULL DEFAULT now(),
    cierre_recibido_servidor timestamptz,
    ultima_recepcion_servidor timestamptz,
    secuencia_final_esperada bigint
        CHECK (secuencia_final_esperada >= 0),
    cantidad_puntos bigint NOT NULL DEFAULT 0
        CHECK (cantidad_puntos >= 0),
    ultima_secuencia_recibida bigint NOT NULL DEFAULT 0
        CHECK (ultima_secuencia_recibida >= 0),
    revision_datos bigint NOT NULL DEFAULT 0,
    revision_ruta bigint NOT NULL DEFAULT 0,
    distancia_observada_m double precision
        CHECK (distancia_observada_m >= 0),
    duracion_monotonica_ms bigint
        CHECK (duracion_monotonica_ms >= 0),
    observaciones text,
    CHECK (revision_ruta >= 0 AND revision_ruta <= revision_datos)
);

CREATE TABLE IF NOT EXISTS puntos_viaje (
    viaje_id uuid NOT NULL REFERENCES viajes(id),
    secuencia bigint NOT NULL CHECK (secuencia > 0),
    capturado_en timestamptz NOT NULL,
    recibido_en timestamptz NOT NULL DEFAULT now(),
    geom geometry(Point, 4326) NOT NULL,
    precision_m real NOT NULL CHECK (precision_m >= 0),
    velocidad_mps real CHECK (velocidad_mps >= 0),
    rumbo_grados real CHECK (rumbo_grados >= 0 AND rumbo_grados < 360),
    altitud_m real,
    sesion_captura_id uuid NOT NULL,
    tiempo_monotonico_ms bigint CHECK (tiempo_monotonico_ms >= 0),
    segmento_local integer NOT NULL DEFAULT 1 CHECK (segmento_local > 0),
    calidad text NOT NULL DEFAULT 'PENDIENTE'
        CHECK (calidad IN ('PENDIENTE', 'VALIDO', 'BAJA_PRECISION', 'SOSPECHOSO')),
    motivo_calidad text,
    PRIMARY KEY (viaje_id, secuencia),
    CHECK (NOT ST_IsEmpty(geom)),
    CHECK (ST_X(geom) BETWEEN -180 AND 180),
    CHECK (ST_Y(geom) BETWEEN -90 AND 90)
);

CREATE TABLE IF NOT EXISTS segmentos_viaje (
    viaje_id uuid NOT NULL REFERENCES viajes(id),
    numero integer NOT NULL CHECK (numero > 0),
    secuencia_desde bigint NOT NULL,
    secuencia_hasta bigint NOT NULL,
    geom geometry(LineString, 4326) NOT NULL,
    distancia_m double precision NOT NULL CHECK (distancia_m >= 0),
    revision_origen bigint NOT NULL,
    PRIMARY KEY (viaje_id, numero),
    CHECK (secuencia_hasta > secuencia_desde),
    CHECK (ST_NPoints(geom) >= 2)
);

CREATE INDEX IF NOT EXISTS ix_viajes_piloto_fecha
    ON viajes (empresa_id, piloto_id, inicio_dispositivo DESC);

CREATE INDEX IF NOT EXISTS ix_viajes_obra_fecha
    ON viajes (empresa_id, obra_destino_id, inicio_dispositivo DESC);

CREATE INDEX IF NOT EXISTS ix_viajes_pendientes
    ON viajes (ultima_recepcion_servidor)
    WHERE revision_ruta < revision_datos;

CREATE UNIQUE INDEX IF NOT EXISTS ux_viaje_en_curso_piloto
    ON viajes (empresa_id, piloto_id)
    WHERE estado = 'EN_CURSO';

CREATE INDEX IF NOT EXISTS ix_dispositivos_empresa_piloto
    ON dispositivos (empresaid, pilotid)
    WHERE vigente = true;

CREATE INDEX IF NOT EXISTS ix_vehiculos_empresa
    ON vehiculos (empresaid)
    WHERE vigente = true;
