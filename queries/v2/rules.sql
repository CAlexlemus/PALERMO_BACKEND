-- Ejecutar después de 01_esquema.sql. Se evalúa en BD, no en el teléfono.
BEGIN;
SET LOCAL search_path = asistencia_v2, public;

CREATE FUNCTION asistencia_v2.validar_jornada() RETURNS trigger
LANGUAGE plpgsql SET search_path = asistencia_v2, public AS $$
DECLARE a asignaciones_horario; d horario_detalles; h horarios;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'cancelada' - 'updated_at') IS DISTINCT FROM
       (to_jsonb(OLD) - 'cancelada' - 'updated_at') THEN
      RAISE EXCEPTION 'La jornada conserva sus instantes y política; cancelar y crear otra';
    END IF;
    IF NEW.cancelada <> OLD.cancelada AND EXISTS (
      SELECT 1 FROM registros_asistencia WHERE jornada_id = OLD.id
    ) THEN RAISE EXCEPTION 'No cancelar jornadas con marcajes'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO STRICT a FROM asignaciones_horario WHERE id = NEW.asignacion_horario_id;
  SELECT * INTO STRICT d FROM horario_detalles WHERE id = NEW.horario_detalle_id;
  SELECT * INTO STRICT h FROM horarios WHERE id = NEW.horario_id;
  IF NOT a.is_active OR NOT (daterange(a.vigente_desde,a.vigente_hasta,'[)') @> NEW.fecha_laboral)
    OR EXTRACT(ISODOW FROM NEW.fecha_laboral)::int <> d.dia_iso THEN
    RAISE EXCEPTION 'La jornada no corresponde a la vigencia o día del horario';
  END IF;
  -- Las FK compuestas comprobarán que detalle y asignación pertenecen al mismo horario.
  NEW.inicio_programado := (NEW.fecha_laboral + d.hora_inicio) AT TIME ZONE h.zona_horaria;
  NEW.fin_programado := (NEW.fecha_laboral + d.dias_fin + d.hora_fin) AT TIME ZONE h.zona_horaria;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_jornada BEFORE INSERT OR UPDATE ON jornadas
FOR EACH ROW EXECUTE FUNCTION asistencia_v2.validar_jornada();

CREATE FUNCTION asistencia_v2.evaluar_asistencia() RETURNS trigger
LANGUAGE plpgsql SET search_path = asistencia_v2, public AS $$
DECLARE
  p configuraciones_asistencia; j jornadas; g geocercas;
  referencia timestamptz; delta numeric; limite_antes integer; limite_despues integer;
  falta_foto boolean; falta_ubicacion boolean; politica_centro uuid;
BEGIN
  -- Solo el rol de migración puede insertar LEGADO. El rol de aplicación usa
  -- permisos de columnas (ver 00_Refactorizacion_Asistencia.md), omite origen y obtiene el DEFAULT APP.
  IF NEW.origen = 'LEGADO' THEN
    NEW.estado_temporal := 'NO_EVALUADO'; NEW.estado_ubicacion := 'NO_EVALUADO';
    NEW.estado_evidencia := 'NO_EVALUADO';
    NEW.desfase_seg := NULL; NEW.retraso_seg := NULL; NEW.distancia_fuera_m := NULL;
    RETURN NEW;
  END IF;
  NEW.fecha_servidor := clock_timestamp();
  IF NEW.fuente_hora = 'SERVIDOR' THEN NEW.fecha_efectiva := NEW.fecha_servidor;
  ELSIF NEW.fuente_hora = 'DISPOSITIVO_VALIDADO' THEN
    IF NEW.fecha_dispositivo IS NULL THEN RAISE EXCEPTION 'Falta fecha del dispositivo'; END IF;
    -- La confiabilidad de este reloj debe resolverla NestJS antes de insertar.
    NEW.fecha_efectiva := NEW.fecha_dispositivo;
  ELSE RAISE EXCEPTION 'Fuente de hora inválida para APP'; END IF;
  IF NOT EXISTS (SELECT 1 FROM usuario_empresas u WHERE u.id=NEW.usuario_empresa_id
    AND tstzrange(u.vigente_desde,u.vigente_hasta,'[)') @> NEW.fecha_efectiva) THEN
    RAISE EXCEPTION 'Marcaje fuera de la vigencia de la membresía';
  END IF;
  IF NEW.centro_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM asignaciones_centros a WHERE a.usuario_empresa_id=NEW.usuario_empresa_id
      AND a.centro_id=NEW.centro_id AND a.is_active
      AND tstzrange(a.vigente_desde,a.vigente_hasta,'[)') @> NEW.fecha_efectiva
  ) THEN RAISE EXCEPTION 'El empleado no tiene asignación al centro en ese instante'; END IF;

  IF NEW.centro_id IS NOT NULL THEN
    SELECT a.configuracion_id INTO politica_centro FROM asignaciones_centros a
    WHERE a.usuario_empresa_id=NEW.usuario_empresa_id AND a.centro_id=NEW.centro_id
      AND a.is_active AND tstzrange(a.vigente_desde,a.vigente_hasta,'[)') @> NEW.fecha_efectiva;
  END IF;
  IF NEW.jornada_id IS NOT NULL THEN
    SELECT * INTO STRICT j FROM jornadas WHERE id=NEW.jornada_id FOR UPDATE;
    NEW.configuracion_id := COALESCE(politica_centro,j.configuracion_id);
  ELSE
    NEW.configuracion_id := COALESCE(politica_centro,NEW.configuracion_id);
  END IF;
  SELECT * INTO STRICT p FROM configuraciones_asistencia WHERE id=NEW.configuracion_id;
  NEW.desfase_seg := NULL; NEW.retraso_seg := NULL;
  IF NEW.jornada_id IS NULL THEN NEW.estado_temporal := 'SIN_HORARIO';
  ELSE
    IF j.cancelada THEN RAISE EXCEPTION 'Jornada cancelada'; END IF;
    IF NEW.evento='ENTRADA' THEN
      referencia := j.inicio_programado;
      limite_antes := p.umbral_anticipacion_seg; limite_despues := p.tolerancia_entrada_seg;
    ELSE
      referencia := j.fin_programado;
      limite_antes := p.tolerancia_salida_seg; limite_despues := 0;
    END IF;
    delta := EXTRACT(EPOCH FROM NEW.fecha_efectiva-referencia);
    NEW.desfase_seg := trunc(delta)::integer;
    NEW.retraso_seg := ceil(greatest(delta,0))::integer;
    NEW.estado_temporal := CASE WHEN delta < -limite_antes THEN 'ANTES'
      WHEN delta > limite_despues THEN 'TARDE' ELSE 'A_TIEMPO' END;
  END IF;

  NEW.distancia_fuera_m := NULL;
  IF NEW.centro_id IS NULL THEN NEW.estado_ubicacion := 'NO_APLICA';
  ELSIF NEW.ubicacion IS NULL THEN NEW.estado_ubicacion := 'SIN_UBICACION';
  ELSIF NEW.geocerca_id IS NULL THEN NEW.estado_ubicacion := 'SIN_GEOCERCA';
  ELSE
    SELECT * INTO STRICT g FROM geocercas WHERE id=NEW.geocerca_id;
    IF g.vigente_desde > NEW.fecha_efectiva OR EXISTS (
      SELECT 1 FROM geocercas posterior WHERE posterior.centro_id=g.centro_id
        AND posterior.vigente_desde > g.vigente_desde
        AND posterior.vigente_desde <= NEW.fecha_efectiva
    ) THEN RAISE EXCEPTION 'No es la versión de geocerca vigente al marcar'; END IF;
    IF g.poligono IS NOT NULL THEN
      NEW.distancia_fuera_m := ST_Distance(g.poligono, NEW.ubicacion);
    ELSE
      NEW.distancia_fuera_m := greatest(ST_Distance(g.centro,NEW.ubicacion)-g.radio_m,0);
    END IF;
    NEW.estado_ubicacion := CASE
      WHEN NEW.precision_m IS NULL OR NEW.precision_m > p.precision_maxima_m THEN 'IMPRECISA'
      WHEN (g.poligono IS NOT NULL AND ST_Covers(g.poligono,NEW.ubicacion))
        OR (g.centro IS NOT NULL AND ST_DWithin(g.centro,NEW.ubicacion,g.radio_m)) THEN 'DENTRO'
      WHEN NEW.distancia_fuera_m <= p.margen_cercania_m THEN 'CERCA'
      ELSE 'LEJOS' END;
  END IF;
  falta_foto := p.requiere_foto AND nullif(btrim(NEW.url_foto),'') IS NULL;
  falta_ubicacion := p.requiere_ubicacion AND NEW.ubicacion IS NULL;
  NEW.estado_evidencia := CASE WHEN falta_foto AND falta_ubicacion THEN 'FALTAN_AMBAS'
    WHEN falta_foto THEN 'FALTA_FOTO' WHEN falta_ubicacion THEN 'FALTA_UBICACION'
    ELSE 'COMPLETA' END;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_evaluar_asistencia BEFORE INSERT ON registros_asistencia
FOR EACH ROW EXECUTE FUNCTION asistencia_v2.evaluar_asistencia();

CREATE FUNCTION asistencia_v2.validar_viaje() RETURNS trigger
LANGUAGE plpgsql SET search_path=asistencia_v2,public AS $$
DECLARE piloto uuid;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.empresa_id,NEW.piloto_membresia_id,NEW.dispositivo_id,NEW.inicio_dispositivo,NEW.origen)
       IS DISTINCT FROM ROW(OLD.empresa_id,OLD.piloto_membresia_id,OLD.dispositivo_id,OLD.inicio_dispositivo,OLD.origen) THEN
      RAISE EXCEPTION 'No se puede reasignar un viaje histórico';
    END IF;
    IF OLD.estado <> 'EN_CURSO' AND NEW.estado <> OLD.estado THEN
      RAISE EXCEPTION 'Un viaje cerrado no puede reabrirse';
    END IF;
  END IF;
  IF NEW.origen='APP' AND NEW.dispositivo_id IS NOT NULL THEN
    SELECT usuario_id INTO STRICT piloto FROM usuario_empresas WHERE id=NEW.piloto_membresia_id;
    IF NOT EXISTS (SELECT 1 FROM dispositivos WHERE id=NEW.dispositivo_id AND usuario_id=piloto) THEN
      RAISE EXCEPTION 'El dispositivo no pertenece al piloto';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_viaje BEFORE INSERT OR UPDATE ON viajes
FOR EACH ROW EXECUTE FUNCTION asistencia_v2.validar_viaje();

-- Datos originales: append-only. La revisión aumenta solo por puntos nuevos,
-- incluso si llegan después de finalizar por sincronización offline.
CREATE FUNCTION asistencia_v2.revisar_punto() RETURNS trigger
LANGUAGE plpgsql SET search_path=asistencia_v2,public AS $$
BEGIN
  IF NEW.origen='APP' THEN
    UPDATE viajes SET revision_datos=revision_datos+1 WHERE id=NEW.viaje_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_revisar_punto AFTER INSERT ON puntos_viaje
FOR EACH ROW EXECUTE FUNCTION asistencia_v2.revisar_punto();
COMMIT;
