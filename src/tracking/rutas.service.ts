import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CalidadPunto } from '../common/enums/calidad-punto.enum';
import { ConsultaPuntosDto } from './dto/consulta-puntos.dto';
import { assertCanReadViaje, toNumber } from './tracking.access';
import { ViajesService } from './viajes.service';

type PuntoRaw = {
  secuencia: string;
  capturado_en: Date;
  longitud: number;
  latitud: number;
  precision_m: number;
  velocidad_mps: number | null;
  rumbo_grados: number | null;
  altitud_m: number | null;
  sesion_captura_id: string;
  tiempo_monotonico_ms: string | null;
  segmento_local: number;
  calidad: CalidadPunto;
  motivo_calidad: string | null;
};

type PendienteRow = {
  id: string;
  revision_datos: string;
};

const GAP_MOVIMIENTO_MS = 30_000;
const PRECISION_VALIDA_M = 25;
const PRECISION_BAJA_M = 50;

export type RutaGeoJsonResponse = {
  type: 'FeatureCollection';
  properties: {
    viajeId: string;
    revisionDatos: number;
    revisionRuta: number;
    rutaPendiente: boolean;
    distanciaObservadaM: number | null;
    calidad: {
      validos: number;
      bajaPrecision: number;
      sospechosos: number;
      pendientes: number;
    };
    huecos: Array<{ desdeSecuencia: number; hastaSecuencia: number }>;
  };
  features: Array<Record<string, unknown>>;
};

@Injectable()
export class RutasService {
  private readonly logger = new Logger(RutasService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly viajesService: ViajesService,
  ) {}

  async getRuta(user: AuthUser, viajeId: string): Promise<RutaGeoJsonResponse> {
    const viaje = await this.viajesService.getViajeOrFail(viajeId);
    assertCanReadViaje(user, viaje);

    const revisionDatos = toNumber(viaje.revisionDatos);
    const revisionRuta = toNumber(viaje.revisionRuta);

    const segmentos = (await this.dataSource.query(
      `
      SELECT
        numero,
        secuencia_desde,
        secuencia_hasta,
        distancia_m,
        ST_AsGeoJSON(geom)::json AS geom
      FROM segmentos_viaje
      WHERE viaje_id = $1::uuid
      ORDER BY numero
      `,
      [viajeId],
    )) as Array<{
      numero: number;
      secuencia_desde: string;
      secuencia_hasta: string;
      distancia_m: number;
      geom: { type: 'LineString'; coordinates: [number, number][] };
    }>;

    const extremos = (await this.dataSource.query(
      `
      SELECT
        secuencia,
        calidad,
        ST_X(geom) AS longitud,
        ST_Y(geom) AS latitud,
        precision_m
      FROM puntos_viaje
      WHERE viaje_id = $1::uuid
        AND secuencia IN (
          (SELECT MIN(secuencia) FROM puntos_viaje WHERE viaje_id = $1::uuid),
          (SELECT MAX(secuencia) FROM puntos_viaje WHERE viaje_id = $1::uuid)
        )
      ORDER BY secuencia
      `,
      [viajeId],
    )) as Array<{
      secuencia: string;
      calidad: CalidadPunto;
      longitud: number;
      latitud: number;
      precision_m: number;
    }>;

    const conteos = (await this.dataSource.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE calidad = 'VALIDO')::int AS validos,
        COUNT(*) FILTER (WHERE calidad = 'BAJA_PRECISION')::int AS baja_precision,
        COUNT(*) FILTER (WHERE calidad = 'SOSPECHOSO')::int AS sospechosos,
        COUNT(*) FILTER (WHERE calidad = 'PENDIENTE')::int AS pendientes
      FROM puntos_viaje
      WHERE viaje_id = $1::uuid
      `,
      [viajeId],
    )) as Array<{
      validos: number;
      baja_precision: number;
      sospechosos: number;
      pendientes: number;
    }>;

    const huecos = await this.detectarHuecosSecuencia(viajeId);

    const features: Array<Record<string, unknown>> = segmentos.map((s) => ({
      type: 'Feature',
      geometry: s.geom,
      properties: {
        tipo: 'segmento',
        numero: s.numero,
        secuenciaDesde: toNumber(s.secuencia_desde),
        secuenciaHasta: toNumber(s.secuencia_hasta),
        distanciaM: s.distancia_m,
      },
    }));

    if (extremos.length > 0) {
      const start = extremos[0];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(start.longitud), Number(start.latitud)],
        },
        properties: {
          tipo: 'inicio',
          secuencia: toNumber(start.secuencia),
          calidad: start.calidad,
          precisionM: Number(start.precision_m),
        },
      });
    }

    if (extremos.length > 1) {
      const end = extremos[extremos.length - 1];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(end.longitud), Number(end.latitud)],
        },
        properties: {
          tipo: 'fin',
          secuencia: toNumber(end.secuencia),
          calidad: end.calidad,
          precisionM: Number(end.precision_m),
        },
      });
    } else if (extremos.length === 1) {
      // Un solo punto: ya marcado como inicio; también como fin aislado.
      const only = extremos[0];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(only.longitud), Number(only.latitud)],
        },
        properties: {
          tipo: 'punto_aislado',
          secuencia: toNumber(only.secuencia),
          calidad: only.calidad,
          precisionM: Number(only.precision_m),
        },
      });
    }

    const c = conteos[0] ?? {
      validos: 0,
      baja_precision: 0,
      sospechosos: 0,
      pendientes: 0,
    };

    return {
      type: 'FeatureCollection',
      properties: {
        viajeId,
        revisionDatos,
        revisionRuta,
        rutaPendiente: revisionRuta < revisionDatos,
        distanciaObservadaM: viaje.distanciaObservadaM,
        calidad: {
          validos: c.validos,
          bajaPrecision: c.baja_precision,
          sospechosos: c.sospechosos,
          pendientes: c.pendientes,
        },
        huecos,
      },
      features,
    };
  }

  async getPuntos(
    user: AuthUser,
    viajeId: string,
    query: ConsultaPuntosDto,
  ) {
    const viaje = await this.viajesService.getViajeOrFail(viajeId);
    assertCanReadViaje(user, viaje);

    const despuesDe = query.despuesDe ?? 0;
    const limite = query.limite ?? 200;

    const rows = (await this.dataSource.query(
      `
      SELECT
        secuencia,
        capturado_en,
        recibido_en,
        ST_X(geom) AS longitud,
        ST_Y(geom) AS latitud,
        precision_m,
        velocidad_mps,
        rumbo_grados,
        altitud_m,
        sesion_captura_id,
        tiempo_monotonico_ms,
        segmento_local,
        calidad,
        motivo_calidad
      FROM puntos_viaje
      WHERE viaje_id = $1::uuid
        AND secuencia > $2::bigint
      ORDER BY secuencia ASC
      LIMIT $3::int
      `,
      [viajeId, despuesDe, limite],
    )) as Array<PuntoRaw & { recibido_en: Date }>;

    return {
      viajeId,
      despuesDe,
      limite,
      puntos: rows.map((r) => ({
        secuencia: toNumber(r.secuencia),
        capturadoEn: r.capturado_en,
        recibidoEn: r.recibido_en,
        latitud: Number(r.latitud),
        longitud: Number(r.longitud),
        precisionM: Number(r.precision_m),
        velocidadMps:
          r.velocidad_mps === null ? null : Number(r.velocidad_mps),
        rumboGrados: r.rumbo_grados === null ? null : Number(r.rumbo_grados),
        altitudM: r.altitud_m === null ? null : Number(r.altitud_m),
        sesionCapturaId: r.sesion_captura_id,
        tiempoMonotonicoMs:
          r.tiempo_monotonico_ms === null
            ? null
            : toNumber(r.tiempo_monotonico_ms),
        segmentoLocal: Number(r.segmento_local),
        calidad: r.calidad,
        motivoCalidad: r.motivo_calidad,
      })),
    };
  }

  /** Procesa viajes con revision_ruta < revision_datos. */
  async procesarPendientes(): Promise<number> {
    const pendientes = (await this.dataSource.query(
      `
      SELECT id, revision_datos
      FROM viajes
      WHERE revision_ruta < revision_datos
      ORDER BY ultima_recepcion_servidor NULLS LAST
      LIMIT 20
      `,
    )) as PendienteRow[];

    let procesados = 0;
    for (const p of pendientes) {
      try {
        const ok = await this.reconstruirViaje(
          p.id,
          toNumber(p.revision_datos),
        );
        if (ok) {
          procesados += 1;
        }
      } catch (error) {
        this.logger.warn(
          `Error reconstruyendo ruta del viaje ${p.id}: ${String(error)}`,
        );
      }
    }
    return procesados;
  }

  async reconstruirViaje(
    viajeId: string,
    revisionEsperada: number,
  ): Promise<boolean> {
    const puntos = (await this.dataSource.query(
      `
      SELECT
        secuencia,
        capturado_en,
        ST_X(geom) AS longitud,
        ST_Y(geom) AS latitud,
        precision_m,
        velocidad_mps,
        rumbo_grados,
        altitud_m,
        sesion_captura_id,
        tiempo_monotonico_ms,
        segmento_local,
        calidad,
        motivo_calidad
      FROM puntos_viaje
      WHERE viaje_id = $1::uuid
      ORDER BY secuencia ASC
      `,
      [viajeId],
    )) as PuntoRaw[];

    const evaluados = this.evaluarCalidad(puntos);
    const segmentos = this.construirSegmentos(evaluados);

    return this.dataSource.transaction(async (manager) => {
      const locked = await this.viajesService.lockViaje(manager, viajeId);
      if (!locked) {
        throw new NotFoundException(`No se encontró el viaje "${viajeId}"`);
      }

      const revisionActual = toNumber(locked.revision_datos);
      if (revisionActual !== revisionEsperada) {
        return false;
      }

      await manager.query(
        `DELETE FROM segmentos_viaje WHERE viaje_id = $1::uuid`,
        [viajeId],
      );

      await this.persistirCalidad(manager, viajeId, evaluados);

      let distanciaTotal = 0;
      let numero = 1;

      for (const seg of segmentos) {
        if (seg.coords.length < 2) {
          continue;
        }

        const coordsJson = JSON.stringify(
          seg.coords.map(([lng, lat]) => ({ x: lng, y: lat })),
        );

        const lengthRows = (await manager.query(
          `
          SELECT ST_Length(
            ST_SetSRID(
              ST_MakeLine(ARRAY(
                SELECT ST_MakePoint(c.x, c.y)
                FROM jsonb_to_recordset($1::jsonb) AS c(x double precision, y double precision)
              )),
              4326
            )::geography
          ) AS distancia_m
          `,
          [coordsJson],
        )) as Array<{ distancia_m: number }>;

        const distanciaM = Number(lengthRows[0]?.distancia_m ?? 0);
        distanciaTotal += distanciaM;

        await manager.query(
          `
          INSERT INTO segmentos_viaje (
            viaje_id, numero, secuencia_desde, secuencia_hasta,
            geom, distancia_m, revision_origen
          )
          SELECT
            $1::uuid,
            $2,
            $3::bigint,
            $4::bigint,
            ST_SetSRID(
              ST_MakeLine(ARRAY(
                SELECT ST_MakePoint(c.x, c.y)
                FROM jsonb_to_recordset($5::jsonb) AS c(x double precision, y double precision)
              )),
              4326
            ),
            $6,
            $7::bigint
          `,
          [
            viajeId,
            numero,
            seg.secuenciaDesde,
            seg.secuenciaHasta,
            coordsJson,
            distanciaM,
            revisionEsperada,
          ],
        );
        numero += 1;
      }

      await manager.query(
        `
        UPDATE viajes
        SET
          revision_ruta = $2::bigint,
          distancia_observada_m = $3
        WHERE id = $1::uuid
        `,
        [viajeId, revisionEsperada, distanciaTotal],
      );

      return true;
    });
  }

  private async persistirCalidad(
    manager: EntityManager,
    viajeId: string,
    puntos: Array<PuntoRaw & { calidadCalc: CalidadPunto; motivo: string | null }>,
  ): Promise<void> {
    if (puntos.length === 0) {
      return;
    }

    const payload = puntos.map((p) => ({
      secuencia: toNumber(p.secuencia),
      calidad: p.calidadCalc,
      motivo_calidad: p.motivo,
    }));

    await manager.query(
      `
      UPDATE puntos_viaje AS p
      SET
        calidad = v.calidad,
        motivo_calidad = v.motivo_calidad
      FROM jsonb_to_recordset($2::jsonb) AS v (
        secuencia bigint,
        calidad text,
        motivo_calidad text
      )
      WHERE p.viaje_id = $1::uuid
        AND p.secuencia = v.secuencia
      `,
      [viajeId, JSON.stringify(payload)],
    );
  }

  private evaluarCalidad(
    puntos: PuntoRaw[],
  ): Array<PuntoRaw & { calidadCalc: CalidadPunto; motivo: string | null }> {
    return puntos.map((p, index) => {
      const precision = Number(p.precision_m);
      let calidadCalc = CalidadPunto.VALIDO;
      let motivo: string | null = null;

      if (precision > PRECISION_BAJA_M) {
        calidadCalc = CalidadPunto.SOSPECHOSO;
        motivo = `precisión ${precision} m > ${PRECISION_BAJA_M} m`;
      } else if (precision > PRECISION_VALIDA_M) {
        calidadCalc = CalidadPunto.BAJA_PRECISION;
        motivo = `precisión ${precision} m entre ${PRECISION_VALIDA_M} y ${PRECISION_BAJA_M} m`;
      }

      if (index > 0 && calidadCalc !== CalidadPunto.SOSPECHOSO) {
        const prev = puntos[index - 1];
        const dt =
          new Date(p.capturado_en).getTime() -
          new Date(prev.capturado_en).getTime();
        const dist = this.haversineM(
          Number(prev.latitud),
          Number(prev.longitud),
          Number(p.latitud),
          Number(p.longitud),
        );
        if (dt > 0) {
          const velocidad = dist / (dt / 1000);
          // ~70 m/s ≈ 252 km/h como tope plausible inicial
          if (velocidad > 70) {
            calidadCalc = CalidadPunto.SOSPECHOSO;
            motivo = `salto incompatible (~${velocidad.toFixed(1)} m/s)`;
          }
        }
      }

      return { ...p, calidadCalc, motivo };
    });
  }

  private construirSegmentos(
    puntos: Array<PuntoRaw & { calidadCalc: CalidadPunto }>,
  ): Array<{
    secuenciaDesde: number;
    secuenciaHasta: number;
    coords: [number, number][];
  }> {
    const segmentos: Array<{
      secuenciaDesde: number;
      secuenciaHasta: number;
      coords: [number, number][];
    }> = [];

    let current: {
      secuenciaDesde: number;
      secuenciaHasta: number;
      coords: [number, number][];
      lastSesion: string;
      lastSegmentoLocal: number;
      lastCapturado: number;
      lastSeq: number;
    } | null = null;

    const flush = () => {
      if (current && current.coords.length >= 2) {
        segmentos.push({
          secuenciaDesde: current.secuenciaDesde,
          secuenciaHasta: current.secuenciaHasta,
          coords: current.coords,
        });
      }
      current = null;
    };

    for (const p of puntos) {
      if (p.calidadCalc === CalidadPunto.SOSPECHOSO) {
        flush();
        continue;
      }

      const seq = toNumber(p.secuencia);
      const capturado = new Date(p.capturado_en).getTime();
      const coord: [number, number] = [
        Number(p.longitud),
        Number(p.latitud),
      ];

      if (!current) {
        current = {
          secuenciaDesde: seq,
          secuenciaHasta: seq,
          coords: [coord],
          lastSesion: p.sesion_captura_id,
          lastSegmentoLocal: Number(p.segmento_local),
          lastCapturado: capturado,
          lastSeq: seq,
        };
        continue;
      }

      const gapTiempo = capturado - current.lastCapturado;
      const gapSecuencia = seq !== current.lastSeq + 1;
      const cambioSesion = p.sesion_captura_id !== current.lastSesion;
      const cambioSegmentoLocal =
        Number(p.segmento_local) !== current.lastSegmentoLocal;

      if (
        gapSecuencia ||
        cambioSesion ||
        cambioSegmentoLocal ||
        gapTiempo > GAP_MOVIMIENTO_MS
      ) {
        flush();
        current = {
          secuenciaDesde: seq,
          secuenciaHasta: seq,
          coords: [coord],
          lastSesion: p.sesion_captura_id,
          lastSegmentoLocal: Number(p.segmento_local),
          lastCapturado: capturado,
          lastSeq: seq,
        };
        continue;
      }

      current.coords.push(coord);
      current.secuenciaHasta = seq;
      current.lastCapturado = capturado;
      current.lastSeq = seq;
    }

    flush();
    return segmentos;
  }

  private async detectarHuecosSecuencia(
    viajeId: string,
  ): Promise<Array<{ desdeSecuencia: number; hastaSecuencia: number }>> {
    const rows = (await this.dataSource.query(
      `
      WITH ordered AS (
        SELECT secuencia::bigint AS secuencia
        FROM puntos_viaje
        WHERE viaje_id = $1::uuid
        ORDER BY secuencia
      ),
      gaps AS (
        SELECT
          lag(secuencia) OVER (ORDER BY secuencia) AS prev,
          secuencia AS curr
        FROM ordered
      )
      SELECT (prev + 1) AS desde, (curr - 1) AS hasta
      FROM gaps
      WHERE prev IS NOT NULL AND curr > prev + 1
      ORDER BY desde
      `,
      [viajeId],
    )) as Array<{ desde: string; hasta: string }>;

    return rows.map((r) => ({
      desdeSecuencia: toNumber(r.desde),
      hastaSecuencia: toNumber(r.hasta),
    }));
  }

  private haversineM(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
}
