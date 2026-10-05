import {
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { AuthUser } from '../auth/types/auth-user.type';
import { EstadoViaje } from '../common/enums/estado-viaje.enum';
import { AckLoteDto } from './dto/ack-lote.dto';
import { LotePuntosDto, PuntoLoteDto } from './dto/lote-puntos.dto';
import { assertCanWriteViaje, toNumber } from './tracking.access';
import { ViajesService } from './viajes.service';

const MAX_LOTE_BYTES = 256 * 1024;

type PuntoExistenteRow = {
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
};

@Injectable()
export class IngestaService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly viajesService: ViajesService,
  ) {}

  async recibirLote(
    user: AuthUser,
    viajeId: string,
    dto: LotePuntosDto,
    rawBodyBytes?: number,
  ): Promise<AckLoteDto> {
    const size =
      rawBodyBytes ??
      Buffer.byteLength(JSON.stringify(dto), 'utf8');
    if (size > MAX_LOTE_BYTES) {
      throw new PayloadTooLargeException(
        `El lote supera el límite de ${MAX_LOTE_BYTES} bytes`,
      );
    }

    this.validarLoteInterno(dto.puntos);

    return this.dataSource.transaction(async (manager) => {
      const row = await this.viajesService.lockViaje(manager, viajeId);
      if (!row) {
        throw new NotFoundException(`No se encontró el viaje "${viajeId}"`);
      }

      const viaje = this.viajesService.mapRow(row);
      assertCanWriteViaje(user, viaje);

      if (viaje.estado === EstadoViaje.CANCELADO) {
        throw new UnprocessableEntityException(
          'No se aceptan puntos en un viaje CANCELADO',
        );
      }

      const n =
        viaje.secuenciaFinalEsperada === null
          ? null
          : toNumber(viaje.secuenciaFinalEsperada);

      if (viaje.estado === EstadoViaje.FINALIZADO && n === null) {
        throw new UnprocessableEntityException(
          'Viaje finalizado sin secuencia esperada',
        );
      }

      for (const p of dto.puntos) {
        if (n !== null && p.secuencia > n) {
          throw new UnprocessableEntityException(
            `Secuencia ${p.secuencia} supera secuenciaFinalEsperada (${n})`,
          );
        }
        if (
          viaje.estado === EstadoViaje.FINALIZADO &&
          n !== null &&
          (p.secuencia < 1 || p.secuencia > n)
        ) {
          throw new UnprocessableEntityException(
            'Viaje finalizado: solo se confirman duplicados idénticos en rango 1..N',
          );
        }
      }

      const secuencias = dto.puntos.map((p) => p.secuencia);
      const existentes = (await manager.query(
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
          segmento_local
        FROM puntos_viaje
        WHERE viaje_id = $1::uuid
          AND secuencia = ANY($2::bigint[])
        `,
        [viajeId, secuencias],
      )) as PuntoExistenteRow[];

      const existentesMap = new Map(
        existentes.map((e) => [toNumber(e.secuencia), e]),
      );

      let duplicados = 0;
      const aInsertar: PuntoLoteDto[] = [];

      for (const punto of dto.puntos) {
        const prev = existentesMap.get(punto.secuencia);
        if (!prev) {
          if (viaje.estado === EstadoViaje.FINALIZADO) {
            throw new UnprocessableEntityException(
              `Viaje finalizado: no se admiten puntos nuevos (secuencia ${punto.secuencia})`,
            );
          }
          aInsertar.push(punto);
          continue;
        }

        if (!this.contenidoIdentico(punto, prev)) {
          throw new ConflictException(
            `Conflicto en secuencia ${punto.secuencia}: contenido distinto al persistido`,
          );
        }
        duplicados += 1;
      }

      let insertados = 0;
      let maxSecuenciaInsertada = 0;

      if (aInsertar.length > 0) {
        const payload = aInsertar.map((p) => ({
          secuencia: p.secuencia,
          capturado_en: p.capturado_en,
          longitud: p.longitud,
          latitud: p.latitud,
          precision_m: p.precision_m,
          velocidad_mps: p.velocidad_mps ?? null,
          rumbo_grados: p.rumbo_grados ?? null,
          altitud_m: p.altitud_m ?? null,
          sesion_captura_id: p.sesion_captura_id,
          tiempo_monotonico_ms: p.tiempo_monotonico_ms ?? null,
          segmento_local: p.segmento_local,
        }));

        const inserted = (await manager.query(
          `
          INSERT INTO puntos_viaje (
            viaje_id, secuencia, capturado_en, geom,
            precision_m, velocidad_mps, rumbo_grados,
            altitud_m, sesion_captura_id, tiempo_monotonico_ms,
            segmento_local
          )
          SELECT
            $1::uuid,
            p.secuencia,
            p.capturado_en,
            ST_SetSRID(ST_MakePoint(p.longitud, p.latitud), 4326),
            p.precision_m,
            p.velocidad_mps,
            p.rumbo_grados,
            p.altitud_m,
            p.sesion_captura_id,
            p.tiempo_monotonico_ms,
            p.segmento_local
          FROM jsonb_to_recordset($2::jsonb) AS p (
            secuencia bigint,
            capturado_en timestamptz,
            longitud double precision,
            latitud double precision,
            precision_m real,
            velocidad_mps real,
            rumbo_grados real,
            altitud_m real,
            sesion_captura_id uuid,
            tiempo_monotonico_ms bigint,
            segmento_local integer
          )
          ON CONFLICT (viaje_id, secuencia) DO NOTHING
          RETURNING secuencia
          `,
          [viajeId, JSON.stringify(payload)],
        )) as Array<{ secuencia: string }>;

        insertados = inserted.length;
        maxSecuenciaInsertada = inserted.reduce(
          (max, r) => Math.max(max, toNumber(r.secuencia)),
          0,
        );

        if (insertados > 0) {
          await manager.query(
            `
            UPDATE viajes
            SET
              cantidad_puntos = cantidad_puntos + $2::bigint,
              ultima_secuencia_recibida = GREATEST(
                ultima_secuencia_recibida,
                $3::bigint
              ),
              ultima_recepcion_servidor = now(),
              revision_datos = revision_datos + 1
            WHERE id = $1::uuid
            `,
            [viajeId, insertados, maxSecuenciaInsertada],
          );

          await this.viajesService.evaluarCompletitud(manager, viajeId);
        }
      }

      const secuenciasConfirmadas = [...secuencias].sort((a, b) => a - b);

      return {
        batchId: dto.batchId,
        secuenciasConfirmadas,
        insertados,
        duplicados,
      };
    });
  }

  private validarLoteInterno(puntos: PuntoLoteDto[]): void {
    const seen = new Map<number, PuntoLoteDto>();

    for (const p of puntos) {
      if (!Number.isFinite(p.latitud) || !Number.isFinite(p.longitud)) {
        throw new UnprocessableEntityException(
          `Coordenadas no finitas en secuencia ${p.secuencia}`,
        );
      }

      const prev = seen.get(p.secuencia);
      if (prev) {
        if (!this.mismoContenidoDto(prev, p)) {
          throw new ConflictException(
            `El lote contiene la secuencia ${p.secuencia} con contenido distinto`,
          );
        }
        throw new UnprocessableEntityException(
          `El lote contiene la secuencia ${p.secuencia} duplicada`,
        );
      }
      seen.set(p.secuencia, p);
    }
  }

  private contenidoIdentico(
    punto: PuntoLoteDto,
    existente: PuntoExistenteRow,
  ): boolean {
    return (
      new Date(punto.capturado_en).getTime() ===
        new Date(existente.capturado_en).getTime() &&
      this.approxEqual(punto.longitud, Number(existente.longitud)) &&
      this.approxEqual(punto.latitud, Number(existente.latitud)) &&
      this.approxEqual(punto.precision_m, Number(existente.precision_m)) &&
      this.nullableApproxEqual(
        punto.velocidad_mps ?? null,
        existente.velocidad_mps,
      ) &&
      this.nullableApproxEqual(punto.rumbo_grados ?? null, existente.rumbo_grados) &&
      this.nullableApproxEqual(punto.altitud_m ?? null, existente.altitud_m) &&
      punto.sesion_captura_id === existente.sesion_captura_id &&
      (punto.tiempo_monotonico_ms ?? null) ===
        (existente.tiempo_monotonico_ms === null
          ? null
          : toNumber(existente.tiempo_monotonico_ms)) &&
      punto.segmento_local === Number(existente.segmento_local)
    );
  }

  private mismoContenidoDto(a: PuntoLoteDto, b: PuntoLoteDto): boolean {
    return (
      a.capturado_en === b.capturado_en &&
      a.latitud === b.latitud &&
      a.longitud === b.longitud &&
      a.precision_m === b.precision_m &&
      (a.velocidad_mps ?? null) === (b.velocidad_mps ?? null) &&
      (a.rumbo_grados ?? null) === (b.rumbo_grados ?? null) &&
      (a.altitud_m ?? null) === (b.altitud_m ?? null) &&
      a.sesion_captura_id === b.sesion_captura_id &&
      (a.tiempo_monotonico_ms ?? null) === (b.tiempo_monotonico_ms ?? null) &&
      a.segmento_local === b.segmento_local
    );
  }

  private approxEqual(a: number, b: number, eps = 1e-7): boolean {
    return Math.abs(a - b) <= eps;
  }

  private nullableApproxEqual(
    a: number | null,
    b: number | null,
  ): boolean {
    if (a === null && b === null) {
      return true;
    }
    if (a === null || b === null) {
      return false;
    }
    return this.approxEqual(a, Number(b));
  }
}
