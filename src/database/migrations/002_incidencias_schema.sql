-- Reconocimiento condicional del esquema de incidencias.
-- La base de PRODUCCIÓN (Railway) YA tiene estas tablas, índices y el COMMIT aplicado.
-- No ejecutes este archivo contra producción: no hace falta y no debe formar parte del deploy.
-- Adopción segura en una base local vacía (una sola vez):
--   psql con DB_TARGET=local y este archivo.
-- CREATE TABLE IF NOT EXISTS no altera tablas ya creadas y no borra datos.
-- No actives DB_SYNCHRONIZE en Railway.

CREATE TABLE IF NOT EXISTS incidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE RESTRICT,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'reportada'
        CHECK (estado IN ('reportada', 'en_revision', 'resuelta')),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidencia_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidencia_id UUID NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    archivo_clave TEXT NOT NULL UNIQUE,
    nombre_archivo VARCHAR(255),
    tipo_mime VARCHAR(100),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidencias_usuario ON incidencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_obra_fecha ON incidencias(obra_id, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_incidencia_fotos_incidencia ON incidencia_fotos(incidencia_id);
