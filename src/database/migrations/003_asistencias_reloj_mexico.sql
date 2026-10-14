-- Las marcas ya guardadas están en UTC dentro de timestamp sin zona
-- (18:20 en lugar de 12:20). Se reinterpretan una sola vez como UTC y se
-- reescriben con el reloj de America/Mexico_City.
-- El comentario de columna evita aplicar el desfase dos veces.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_description d
    JOIN pg_class c ON c.oid = d.objoid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
    WHERE c.relname = 'registrosasistencia'
      AND a.attname = 'fechahoradispositivo'
      AND d.description = 'reloj America/Mexico_City sin zona'
  ) THEN
    UPDATE registrosasistencia
    SET
      fechahoradispositivo = fechahoradispositivo AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City',
      fechahoraservidor = fechahoraservidor AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City';

    COMMENT ON COLUMN registrosasistencia.fechahoradispositivo
      IS 'reloj America/Mexico_City sin zona';
    COMMENT ON COLUMN registrosasistencia.fechahoraservidor
      IS 'reloj America/Mexico_City sin zona';

    ALTER TABLE registrosasistencia
      ALTER COLUMN fechahoraservidor
      SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City');
  END IF;
END $$;
