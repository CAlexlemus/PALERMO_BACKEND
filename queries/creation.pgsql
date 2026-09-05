-- =========================================
-- HABILITAR EXTENSIONES
-- =========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis; 

-- =========================================
-- 1. CREACIÓN DE CATÁLOGOS BASE (Sin dependencias)
-- =========================================

CREATE TABLE Roles (
    Id SERIAL PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    RequiereFoto BOOLEAN,
    RequiereUbicacion BOOLEAN
);

CREATE TABLE Turnos (
    Id SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    HoraInicio TIME NOT NULL,
    HoraFin TIME NOT NULL,
    MinutosTolerancia INTEGER NOT NULL DEFAULT 15
);

CREATE TABLE Obras (
    Id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    Nombre VARCHAR(150) NOT NULL,
    -- Punto geográfico PostGIS
    Ubicacion GEOGRAPHY(Point, 4326) NOT NULL, 
    RadioMetros INTEGER NOT NULL DEFAULT 50,
    RequiereFoto BOOLEAN,
    RequiereUbicacion BOOLEAN
);

-- =========================================
-- 2. TABLAS DE AGRUPACIÓN (Depende de Obras)
-- =========================================

CREATE TABLE Cuadrillas (
    Id SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    ObraId UUID REFERENCES Obras(Id) ON DELETE SET NULL
);

-- =========================================
-- 3. TABLA DE USUARIOS (Depende de Roles, Turnos y Cuadrillas)
-- =========================================

CREATE TABLE Usuarios (
    Id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    NombreUsuario VARCHAR(50) UNIQUE NOT NULL,
    ContrasenaHash VARCHAR(255) NOT NULL,
    RolId INTEGER NOT NULL REFERENCES Roles(Id),
    JefeId UUID REFERENCES Usuarios(Id),
    CuadrillaId INTEGER REFERENCES Cuadrillas(Id),
    TurnoId INTEGER REFERENCES Turnos(Id),
    RequiereFoto BOOLEAN,
    RequiereUbicacion BOOLEAN
);

-- =========================================
-- 4. TABLA TRANSACCIONAL (Depende de Usuarios y Obras)
-- =========================================

CREATE TABLE RegistrosAsistencia (
    Id UUID PRIMARY KEY,
    UsuarioId UUID NOT NULL REFERENCES Usuarios(Id),
    ObraId UUID NOT NULL REFERENCES Obras(Id),
    TipoEvento VARCHAR(15) NOT NULL CHECK (TipoEvento IN ('ENTRADA', 'SALIDA')),
    FechaHoraDispositivo TIMESTAMP NOT NULL,
    FechaHoraServidor TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EsSincronizacionOffline BOOLEAN NOT NULL DEFAULT FALSE,
    -- Punto geográfico PostGIS
    Ubicacion GEOGRAPHY(Point, 4326) NOT NULL, 
    Altitud DECIMAL(8, 2),
    AgenteDispositivo VARCHAR(255),
    DireccionIp VARCHAR(45),
    UrlFoto TEXT,
    Estado VARCHAR(30) NOT NULL CHECK (Estado IN ('A_TIEMPO', 'TARDE', 'FUERA_GEOCERCA', 'SIN_FOTO'))
);

-- Crear un índice espacial para búsquedas geográficas rápidas
CREATE INDEX IX_RegistrosAsistencia_Ubicacion ON RegistrosAsistencia USING GIST (Ubicacion);