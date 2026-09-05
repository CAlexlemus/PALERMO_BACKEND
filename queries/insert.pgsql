-- =========================================
-- 1. INSERTAR ROLES Y TURNOS
-- =========================================

INSERT INTO Roles (Nombre, RequiereFoto, RequiereUbicacion) VALUES 
('Administrador', FALSE, FALSE),
('Jefe de Obra', TRUE, TRUE),
('Trabajador de Campo', TRUE, TRUE);

INSERT INTO Turnos (Nombre, HoraInicio, HoraFin, MinutosTolerancia) VALUES 
('Diurno', '08:00:00', '17:00:00', 15),
('Nocturno', '18:00:00', '02:00:00', 15);

-- =========================================
-- 2. INSERTAR OBRAS (Usando PostGIS ST_MakePoint)
-- Recordatorio: ST_MakePoint recibe primero la Longitud (X) y luego la Latitud (Y)
-- =========================================

INSERT INTO Obras (Id, Nombre, Ubicacion, RadioMetros, RequiereFoto, RequiereUbicacion) VALUES 
(
    'a1111111-1111-1111-1111-111111111111', 
    'Proyecto Villa Canales', 
    ST_SetSRID(ST_MakePoint(-90.5310, 14.4820), 4326), 
    100, 
    TRUE, 
    TRUE
),
(
    'a2222222-2222-2222-2222-222222222222', 
    'Torre Central', 
    ST_SetSRID(ST_MakePoint(-90.5068, 14.6349), 4326), 
    150, 
    FALSE, 
    TRUE
);

-- =========================================
-- 3. INSERTAR CUADRILLAS
-- Asignamos las cuadrillas al 'Proyecto Villa Canales'
-- =========================================

INSERT INTO Cuadrillas (Nombre, ObraId) VALUES 
('Obra Gris', 'a1111111-1111-1111-1111-111111111111'),
('Electricistas', 'a1111111-1111-1111-1111-111111111111');

-- =========================================
-- 4. INSERTAR USUARIOS
-- =========================================

-- Jefe de Obra (Sin jefe asignado, ID de Rol 2)
INSERT INTO Usuarios (Id, NombreUsuario, ContrasenaHash, RolId, JefeId, CuadrillaId, TurnoId, RequiereFoto, RequiereUbicacion) VALUES 
('b1111111-1111-1111-1111-111111111111', 'carlos.jefe', 'hash_ficticio_123', 2, NULL, NULL, NULL, FALSE, FALSE);

-- Trabajadores de Campo (Reportan a Carlos, Cuadrilla 1, Turno 1)
INSERT INTO Usuarios (Id, NombreUsuario, ContrasenaHash, RolId, JefeId, CuadrillaId, TurnoId, RequiereFoto, RequiereUbicacion) VALUES 
('c1111111-1111-1111-1111-111111111111', 'pedro.obrero', 'hash_ficticio_456', 3, 'b1111111-1111-1111-1111-111111111111', 1, 1, TRUE, TRUE),
('c2222222-2222-2222-2222-222222222222', 'maria.obrera', 'hash_ficticio_789', 3, 'b1111111-1111-1111-1111-111111111111', 1, 1, TRUE, TRUE);

-- =========================================
-- 5. INSERTAR REGISTROS DE ASISTENCIA
-- =========================================

-- Entrada normal de Pedro (A tiempo, con internet)
INSERT INTO RegistrosAsistencia (
    Id, UsuarioId, ObraId, TipoEvento, FechaHoraDispositivo, FechaHoraServidor, 
    EsSincronizacionOffline, Ubicacion, Altitud, AgenteDispositivo, 
    DireccionIp, UrlFoto, Estado
) VALUES 
(
    uuid_generate_v4(), 
    'c1111111-1111-1111-1111-111111111111', 
    'a1111111-1111-1111-1111-111111111111', 
    'ENTRADA', 
    '2024-05-15 07:55:00', 
    CURRENT_TIMESTAMP, 
    FALSE, 
    ST_SetSRID(ST_MakePoint(-90.5312, 14.4821), 4326), -- Ubicación muy cercana a la obra
    1200.0, 
    'Mozilla/5.0 (Linux; Android 13; SM-A536B)', 
    '192.168.1.55', 
    NULL, 
    'A_TIEMPO'
);

-- Entrada offline de María (Llegó tarde, sin internet en el momento)
INSERT INTO RegistrosAsistencia (
    Id, UsuarioId, ObraId, TipoEvento, FechaHoraDispositivo, FechaHoraServidor, 
    EsSincronizacionOffline, Ubicacion, Altitud, AgenteDispositivo, 
    DireccionIp, UrlFoto, Estado
) VALUES 
(
    uuid_generate_v4(),
    'c2222222-2222-2222-2222-222222222222', 
    'a1111111-1111-1111-1111-111111111111', 
    'ENTRADA', 
    '2024-05-15 08:20:00', 
    CURRENT_TIMESTAMP, 
    TRUE, 
    ST_SetSRID(ST_MakePoint(-90.5309, 14.4818), 4326), 
    1200.0, 
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5)', 
    '10.0.0.12', 
    NULL, 
    'TARDE'
);