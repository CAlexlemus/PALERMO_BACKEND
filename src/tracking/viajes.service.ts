import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuthUser } from '../auth/types/auth-user.type';
import { EstadoViaje } from '../common/enums/estado-viaje.enum';
import {
  Dispositivo,
  Obra,
  Vehiculo,
  Viaje,
} from '../entities';
import { CreateViajeDto } from './dto/create-viaje.dto';
import { FinalizarViajeDto } from './dto/finalizar-viaje.dto';
import {
  RangoFaltanteDto,
  SincronizacionViajeDto,
} from './dto/sincronizacion-viaje.dto';
import {
  assertCanReadViaje,
  assertCanWriteViaje,
  requireEmpresaId,
  toNumber,
} from './tracking.access';

type ViajeRow = {
  id: string;
  empresa_id: string;
  piloto_id: string;
  obra_destino_id: string;
  dispositivo_id: string;
  vehiculo_id: string | null;
  estado: EstadoViaje;
  inicio_dispositivo: Date;
  fin_dispositivo: Date | null;
  creado_servidor: Date;
  cierre_recibido_servidor: Date | null;
  ultima_recepcion_servidor: Date | null;
  secuencia_final_esperada: string | null;
  cantidad_puntos: string;
  ultima_secuencia_recibida: string;
  revision_datos: string;
  revision_ruta: string;
  distancia_observada_m: number | null;
  duracion_monotonica_ms: string | null;
  observaciones: string | null;
};

@Injectable()
export class ViajesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Viaje)
    private readonly viajesRepository: Repository<Viaje>,
    @InjectRepository(Obra)
    private readonly obrasRepository: Repository<Obra>,
    @InjectRepository(Dispositivo)
    private readonly dispositivosRepository: Repository<Dispositivo>,
    @InjectRepository(Vehiculo)
    private readonly vehiculosRepository: Repository<Vehiculo>,
  ) {}

  async crear(user: AuthUser, dto: CreateViajeDto): Promise<Viaje> {
    const empresaId = requireEmpresaId(user);

    const obra = await this.obrasRepository.findOne({
      where: { id: dto.obraDestinoId, vigente: true },
    });
    if (!obra) {
      throw new NotFoundException(
        `No se encontró la obra vigente "${dto.obraDestinoId}"`,
      );
    }
    if (obra.empresaId !== empresaId) {
      throw new UnprocessableEntityException(
        'La obra destino no pertenece a la empresa del piloto',
      );
    }

    const dispositivo = await this.dispositivosRepository.findOne({
      where: { id: dto.dispositivoId, vigente: true },
    });
    if (!dispositivo) {
      throw new NotFoundException(
        `No se encontró el dispositivo vigente "${dto.dispositivoId}"`,
      );
    }
    if (
      dispositivo.pilotoId !== user.id ||
      dispositivo.empresaId !== empresaId
    ) {
      throw new UnprocessableEntityException(
        'El dispositivo no está asignado al piloto autenticado o no pertenece a su empresa',
      );
    }

    const vehiculoId = dto.vehiculoId ?? null;
    if (vehiculoId) {
      const vehiculo = await this.vehiculosRepository.findOne({
        where: { id: vehiculoId, vigente: true },
      });
      if (!vehiculo) {
        throw new NotFoundException(
          `No se encontró el vehículo vigente "${vehiculoId}"`,
        );
      }
      if (vehiculo.empresaId !== empresaId) {
        throw new UnprocessableEntityException(
          'El vehículo no pertenece a la empresa del piloto',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const existente = await this.lockViaje(manager, dto.id);

      if (existente) {
        if (
          existente.empresa_id !== empresaId ||
          existente.piloto_id !== user.id ||
          existente.obra_destino_id !== dto.obraDestinoId ||
          existente.dispositivo_id !== dto.dispositivoId ||
          (existente.vehiculo_id ?? null) !== vehiculoId ||
          new Date(existente.inicio_dispositivo).getTime() !==
            new Date(dto.inicioDispositivo).getTime()
        ) {
          throw new ConflictException(
            'Ya existe un viaje con este id y contenido distinto',
          );
        }
        return this.mapRow(existente);
      }

      try {
        await manager.query(
          `
          INSERT INTO viajes (
            id, empresa_id, piloto_id, obra_destino_id, dispositivo_id,
            vehiculo_id, estado, inicio_dispositivo, observaciones
          ) VALUES (
            $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
            $6::uuid, $7, $8::timestamptz, $9
          )
          `,
          [
            dto.id,
            empresaId,
            user.id,
            dto.obraDestinoId,
            dto.dispositivoId,
            vehiculoId,
            EstadoViaje.EN_CURSO,
            dto.inicioDispositivo,
            dto.observaciones ?? null,
          ],
        );
      } catch (error: unknown) {
        const code =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          typeof (error as { code: unknown }).code === 'string'
            ? (error as { code: string }).code
            : null;

        if (code === '23505') {
          const concurrente = await this.lockViaje(manager, dto.id);
          if (concurrente) {
            if (
              concurrente.empresa_id !== empresaId ||
              concurrente.piloto_id !== user.id ||
              concurrente.obra_destino_id !== dto.obraDestinoId ||
              concurrente.dispositivo_id !== dto.dispositivoId ||
              (concurrente.vehiculo_id ?? null) !== vehiculoId ||
              new Date(concurrente.inicio_dispositivo).getTime() !==
                new Date(dto.inicioDispositivo).getTime()
            ) {
              throw new ConflictException(
                'Ya existe un viaje con este id y contenido distinto',
              );
            }
            return this.mapRow(concurrente);
          }
          throw new ConflictException(
            'Ya existe un viaje EN_CURSO para este piloto en la empresa',
          );
        }
        throw error;
      }

      const creado = await this.lockViaje(manager, dto.id);
      if (!creado) {
        throw new NotFoundException(`No se pudo crear el viaje "${dto.id}"`);
      }
      return this.mapRow(creado);
    });
  }

  async finalizar(
    user: AuthUser,
    viajeId: string,
    dto: FinalizarViajeDto,
  ): Promise<SincronizacionViajeDto> {
    return this.dataSource.transaction(async (manager) => {
      const row = await this.lockViaje(manager, viajeId);
      if (!row) {
        throw new NotFoundException(`No se encontró el viaje "${viajeId}"`);
      }

      const viaje = this.mapRow(row);
      assertCanWriteViaje(user, viaje);

      if (
        viaje.estado === EstadoViaje.CANCELADO ||
        viaje.estado === EstadoViaje.INCOMPLETO
      ) {
        throw new UnprocessableEntityException(
          `No se puede finalizar un viaje en estado ${viaje.estado}`,
        );
      }

      const n = dto.secuenciaFinalEsperada;
      const ultima = toNumber(viaje.ultimaSecuenciaRecibida);

      if (n < ultima) {
        throw new UnprocessableEntityException(
          `secuenciaFinalEsperada (${n}) no puede ser menor que la última secuencia almacenada (${ultima})`,
        );
      }

      if (viaje.secuenciaFinalEsperada !== null) {
        const nExistente = toNumber(viaje.secuenciaFinalEsperada);
        const finExistente = viaje.finDispositivo
          ? new Date(viaje.finDispositivo).getTime()
          : null;
        const finNuevo = new Date(dto.finDispositivo).getTime();

        if (nExistente !== n || finExistente !== finNuevo) {
          throw new ConflictException(
            'Ya existe una declaración de cierre distinta para este viaje',
          );
        }

        return this.buildSincronizacion(manager, viajeId);
      }

      const cantidad = toNumber(viaje.cantidadPuntos);
      let nuevoEstado: EstadoViaje = EstadoViaje.SINCRONIZANDO;
      if (n === 0 || cantidad === n) {
        nuevoEstado = EstadoViaje.FINALIZADO;
      }

      await manager.query(
        `
        UPDATE viajes
        SET
          fin_dispositivo = $2::timestamptz,
          secuencia_final_esperada = $3::bigint,
          cierre_recibido_servidor = now(),
          duracion_monotonica_ms = COALESCE($4::bigint, duracion_monotonica_ms),
          observaciones = COALESCE($5, observaciones),
          estado = $6,
          revision_datos = revision_datos + 1
        WHERE id = $1::uuid
        `,
        [
          viajeId,
          dto.finDispositivo,
          n,
          dto.duracionMonotonicaMs ?? null,
          dto.observaciones ?? null,
          nuevoEstado,
        ],
      );

      return this.buildSincronizacion(manager, viajeId);
    });
  }

  async sincronizacion(
    user: AuthUser,
    viajeId: string,
  ): Promise<SincronizacionViajeDto> {
    const viaje = await this.viajesRepository.findOne({ where: { id: viajeId } });
    if (!viaje) {
      throw new NotFoundException(`No se encontró el viaje "${viajeId}"`);
    }
    assertCanReadViaje(user, viaje);
    return this.dataSource.transaction((manager) =>
      this.buildSincronizacion(manager, viajeId),
    );
  }

  async getViajeOrFail(viajeId: string): Promise<Viaje> {
    const viaje = await this.viajesRepository.findOne({ where: { id: viajeId } });
    if (!viaje) {
      throw new NotFoundException(`No se encontró el viaje "${viajeId}"`);
    }
    return viaje;
  }

  /** Tras ingesta: si hay cierre y cantidad_puntos = N → FINALIZADO. */
  async evaluarCompletitud(
    manager: EntityManager,
    viajeId: string,
  ): Promise<void> {
    await manager.query(
      `
      UPDATE viajes
      SET estado = $2
      WHERE id = $1::uuid
        AND secuencia_final_esperada IS NOT NULL
        AND cantidad_puntos = secuencia_final_esperada
        AND estado IN ($3, $4)
      `,
      [
        viajeId,
        EstadoViaje.FINALIZADO,
        EstadoViaje.SINCRONIZANDO,
        EstadoViaje.INCOMPLETO,
      ],
    );
  }

  async buildSincronizacion(
    manager: EntityManager,
    viajeId: string,
  ): Promise<SincronizacionViajeDto> {
    const rows = (await manager.query(
      `SELECT * FROM viajes WHERE id = $1::uuid`,
      [viajeId],
    )) as ViajeRow[];
    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`No se encontró el viaje "${viajeId}"`);
    }

    const n =
      row.secuencia_final_esperada === null
        ? null
        : toNumber(row.secuencia_final_esperada);
    const cantidad = toNumber(row.cantidad_puntos);
    const revisionDatos = toNumber(row.revision_datos);
    const revisionRuta = toNumber(row.revision_ruta);

    let rangosFaltantes: RangoFaltanteDto[] = [];
    if (n !== null && n > 0) {
      rangosFaltantes = await this.calcularRangosFaltantes(manager, viajeId, n);
    }

    return {
      id: row.id,
      estado: row.estado,
      cantidadPuntos: cantidad,
      ultimaSecuenciaRecibida: toNumber(row.ultima_secuencia_recibida),
      secuenciaFinalEsperada: n,
      revisionDatos,
      revisionRuta,
      rutaPendiente: revisionRuta < revisionDatos,
      rangosFaltantes,
      sinEvidenciaGps: n === 0,
    };
  }

  private async calcularRangosFaltantes(
    manager: EntityManager,
    viajeId: string,
    n: number,
  ): Promise<RangoFaltanteDto[]> {
    const result = (await manager.query(
      `
      WITH expected AS (
        SELECT generate_series(1, $2::bigint) AS secuencia
      ),
      missing AS (
        SELECT e.secuencia
        FROM expected e
        LEFT JOIN puntos_viaje p
          ON p.viaje_id = $1::uuid AND p.secuencia = e.secuencia
        WHERE p.secuencia IS NULL
        ORDER BY e.secuencia
      ),
      grouped AS (
        SELECT
          secuencia,
          secuencia - ROW_NUMBER() OVER (ORDER BY secuencia) AS grp
        FROM missing
      )
      SELECT MIN(secuencia)::bigint AS desde, MAX(secuencia)::bigint AS hasta
      FROM grouped
      GROUP BY grp
      ORDER BY desde
      `,
      [viajeId, n],
    )) as Array<{ desde: string; hasta: string }>;

    return result.map((r) => ({
      desde: toNumber(r.desde),
      hasta: toNumber(r.hasta),
    }));
  }

  async lockViaje(
    manager: EntityManager,
    viajeId: string,
  ): Promise<ViajeRow | null> {
    const rows = (await manager.query(
      `SELECT * FROM viajes WHERE id = $1::uuid FOR UPDATE`,
      [viajeId],
    )) as ViajeRow[];
    return rows[0] ?? null;
  }

  mapRow(row: ViajeRow): Viaje {
    const viaje = new Viaje();
    viaje.id = row.id;
    viaje.empresaId = row.empresa_id;
    viaje.pilotoId = row.piloto_id;
    viaje.obraDestinoId = row.obra_destino_id;
    viaje.dispositivoId = row.dispositivo_id;
    viaje.vehiculoId = row.vehiculo_id;
    viaje.estado = row.estado;
    viaje.inicioDispositivo = new Date(row.inicio_dispositivo);
    viaje.finDispositivo = row.fin_dispositivo
      ? new Date(row.fin_dispositivo)
      : null;
    viaje.creadoServidor = new Date(row.creado_servidor);
    viaje.cierreRecibidoServidor = row.cierre_recibido_servidor
      ? new Date(row.cierre_recibido_servidor)
      : null;
    viaje.ultimaRecepcionServidor = row.ultima_recepcion_servidor
      ? new Date(row.ultima_recepcion_servidor)
      : null;
    viaje.secuenciaFinalEsperada = row.secuencia_final_esperada;
    viaje.cantidadPuntos = row.cantidad_puntos;
    viaje.ultimaSecuenciaRecibida = row.ultima_secuencia_recibida;
    viaje.revisionDatos = row.revision_datos;
    viaje.revisionRuta = row.revision_ruta;
    viaje.distanciaObservadaM = row.distancia_observada_m;
    viaje.duracionMonotonicaMs = row.duracion_monotonica_ms;
    viaje.observaciones = row.observaciones;
    return viaje;
  }
}
