jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  TypeOrmModule: { forFeature: jest.fn() },
}));

import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EstadoViaje } from '../common/enums/estado-viaje.enum';
import { IngestaService } from './ingesta.service';
import type { ViajesService } from './viajes.service';

describe('IngestaService (unit)', () => {
  const user = {
    id: 'piloto-1',
    nombreUsuario: 'piloto',
    rolId: 1,
    jefeId: null,
    cuadrillaId: null,
    turnoId: null,
    empresaId: 'empresa-1',
    requiereFoto: null,
    requiereUbicacion: null,
  };

  const basePunto = {
    secuencia: 1,
    capturado_en: '2026-10-04T14:00:00.000Z',
    latitud: 14.6349,
    longitud: -90.5069,
    precision_m: 8.5,
    velocidad_mps: 11.2,
    rumbo_grados: 75,
    altitud_m: null as number | null,
    sesion_captura_id: 'e69d2058-97f7-4efa-b12e-c1084945142b',
    tiempo_monotonico_ms: 12000,
    segmento_local: 1,
  };

  function buildService(opts: {
    existentes?: Array<Record<string, unknown>>;
    insertReturning?: Array<{ secuencia: string }>;
    estado?: EstadoViaje;
    secuenciaFinal?: string | null;
  }) {
    const queries: string[] = [];
    const manager = {
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        queries.push(sql);
        if (sql.includes('FROM puntos_viaje') && sql.includes('ANY')) {
          return opts.existentes ?? [];
        }
        if (sql.includes('jsonb_to_recordset') && sql.includes('RETURNING')) {
          return opts.insertReturning ?? [];
        }
        if (sql.includes('UPDATE viajes')) {
          return [];
        }
        void params;
        return [];
      }),
    };

    const dataSource = {
      transaction: jest.fn(async (fn: (m: typeof manager) => Promise<unknown>) =>
        fn(manager),
      ),
    };

    const viajeRow = {
      id: 'viaje-1',
      empresa_id: 'empresa-1',
      piloto_id: 'piloto-1',
      obra_destino_id: 'obra-1',
      dispositivo_id: 'disp-1',
      vehiculo_id: null,
      estado: opts.estado ?? EstadoViaje.EN_CURSO,
      inicio_dispositivo: new Date('2026-10-04T14:00:00.000Z'),
      fin_dispositivo: null,
      creado_servidor: new Date(),
      cierre_recibido_servidor: null,
      ultima_recepcion_servidor: null,
      secuencia_final_esperada: opts.secuenciaFinal ?? null,
      cantidad_puntos: '0',
      ultima_secuencia_recibida: '0',
      revision_datos: '0',
      revision_ruta: '0',
      distancia_observada_m: null,
      duracion_monotonica_ms: null,
      observaciones: null,
    };

    const viajesService = {
      lockViaje: jest.fn(async () => viajeRow),
      mapRow: jest.fn((row: typeof viajeRow) => ({
        id: row.id,
        empresaId: row.empresa_id,
        pilotoId: row.piloto_id,
        obraDestinoId: row.obra_destino_id,
        dispositivoId: row.dispositivo_id,
        vehiculoId: row.vehiculo_id,
        estado: row.estado,
        inicioDispositivo: row.inicio_dispositivo,
        finDispositivo: row.fin_dispositivo,
        creadoServidor: row.creado_servidor,
        cierreRecibidoServidor: row.cierre_recibido_servidor,
        ultimaRecepcionServidor: row.ultima_recepcion_servidor,
        secuenciaFinalEsperada: row.secuencia_final_esperada,
        cantidadPuntos: row.cantidad_puntos,
        ultimaSecuenciaRecibida: row.ultima_secuencia_recibida,
        revisionDatos: row.revision_datos,
        revisionRuta: row.revision_ruta,
        distanciaObservadaM: row.distancia_observada_m,
        duracionMonotonicaMs: row.duracion_monotonica_ms,
        observaciones: row.observaciones,
      })),
      evaluarCompletitud: jest.fn(async () => undefined),
    } as unknown as ViajesService;

    const service = new IngestaService(
      dataSource as never,
      viajesService,
    );

    return { service, manager, viajesService };
  }

  it('ACK idempotente cuando el punto existe con el mismo contenido', async () => {
    const { service } = buildService({
      existentes: [
        {
          secuencia: '1',
          capturado_en: new Date(basePunto.capturado_en),
          longitud: basePunto.longitud,
          latitud: basePunto.latitud,
          precision_m: basePunto.precision_m,
          velocidad_mps: basePunto.velocidad_mps,
          rumbo_grados: basePunto.rumbo_grados,
          altitud_m: null,
          sesion_captura_id: basePunto.sesion_captura_id,
          tiempo_monotonico_ms: '12000',
          segmento_local: 1,
        },
      ],
    });

    const ack = await service.recibirLote(user, 'viaje-1', {
      batchId: '4f0b5632-37c1-4b15-90d4-711741344247',
      puntos: [basePunto],
    });

    expect(ack.insertados).toBe(0);
    expect(ack.duplicados).toBe(1);
    expect(ack.secuenciasConfirmadas).toEqual([1]);
  });

  it('409 cuando la misma secuencia llega con contenido distinto', async () => {
    const { service } = buildService({
      existentes: [
        {
          secuencia: '1',
          capturado_en: new Date(basePunto.capturado_en),
          longitud: basePunto.longitud,
          latitud: 14.9999,
          precision_m: basePunto.precision_m,
          velocidad_mps: basePunto.velocidad_mps,
          rumbo_grados: basePunto.rumbo_grados,
          altitud_m: null,
          sesion_captura_id: basePunto.sesion_captura_id,
          tiempo_monotonico_ms: '12000',
          segmento_local: 1,
        },
      ],
    });

    await expect(
      service.recibirLote(user, 'viaje-1', {
        batchId: '4f0b5632-37c1-4b15-90d4-711741344247',
        puntos: [basePunto],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza secuencia mayor que N tras cierre', async () => {
    const { service } = buildService({
      estado: EstadoViaje.SINCRONIZANDO,
      secuenciaFinal: '1',
    });

    await expect(
      service.recibirLote(user, 'viaje-1', {
        batchId: '4f0b5632-37c1-4b15-90d4-711741344247',
        puntos: [{ ...basePunto, secuencia: 2 }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
