jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  TypeOrmModule: { forFeature: jest.fn() },
}));

import { ConflictException } from '@nestjs/common';
import { EstadoViaje } from '../common/enums/estado-viaje.enum';
import { ViajesService } from './viajes.service';

describe('ViajesService.finalizar (unit)', () => {
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

  function buildService(rowOverrides: Partial<Record<string, unknown>> = {}) {
    const baseRow = {
      id: 'viaje-1',
      empresa_id: 'empresa-1',
      piloto_id: 'piloto-1',
      obra_destino_id: 'obra-1',
      dispositivo_id: 'disp-1',
      vehiculo_id: null,
      estado: EstadoViaje.EN_CURSO,
      inicio_dispositivo: new Date('2026-10-04T14:00:00.000Z'),
      fin_dispositivo: null,
      creado_servidor: new Date(),
      cierre_recibido_servidor: null,
      ultima_recepcion_servidor: null,
      secuencia_final_esperada: null as string | null,
      cantidad_puntos: '2',
      ultima_secuencia_recibida: '2',
      revision_datos: '1',
      revision_ruta: '0',
      distancia_observada_m: null,
      duracion_monotonica_ms: null,
      observaciones: null,
      ...rowOverrides,
    };

    let current = { ...baseRow };

    const manager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FOR UPDATE') || sql.includes('SELECT * FROM viajes')) {
          return [{ ...current }];
        }
        if (sql.includes('UPDATE viajes')) {
          current = {
            ...current,
            estado: EstadoViaje.SINCRONIZANDO,
            secuencia_final_esperada: '5',
            fin_dispositivo: new Date('2026-10-04T16:30:00.000Z'),
            cierre_recibido_servidor: new Date(),
          };
          return [];
        }
        if (sql.includes('generate_series') || sql.includes('FROM grouped')) {
          return [{ desde: '3', hasta: '5' }];
        }
        return [];
      }),
    };

    const dataSource = {
      transaction: jest.fn(async (fn: (m: typeof manager) => Promise<unknown>) =>
        fn(manager),
      ),
    };

    const service = new ViajesService(
      dataSource as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
    );

    return { service, manager, getCurrent: () => current };
  }

  it('pasa a SINCRONIZANDO cuando faltan puntos para N', async () => {
    const { service } = buildService({ cantidad_puntos: '2' });

    const sync = await service.finalizar(user, 'viaje-1', {
      finDispositivo: '2026-10-04T16:30:00.000Z',
      secuenciaFinalEsperada: 5,
    });

    expect(sync.estado).toBe(EstadoViaje.SINCRONIZANDO);
    expect(sync.secuenciaFinalEsperada).toBe(5);
    expect(sync.rangosFaltantes).toEqual([{ desde: 3, hasta: 5 }]);
  });

  it('409 si el cierre ya existe con valores distintos', async () => {
    const { service } = buildService({
      estado: EstadoViaje.SINCRONIZANDO,
      secuencia_final_esperada: '5',
      fin_dispositivo: new Date('2026-10-04T16:30:00.000Z'),
    });

    await expect(
      service.finalizar(user, 'viaje-1', {
        finDispositivo: '2026-10-04T17:00:00.000Z',
        secuenciaFinalEsperada: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('FINALIZADO inmediato cuando cantidad_puntos = N', async () => {
    const managerQueries: string[] = [];
    const row = {
      id: 'viaje-1',
      empresa_id: 'empresa-1',
      piloto_id: 'piloto-1',
      obra_destino_id: 'obra-1',
      dispositivo_id: 'disp-1',
      vehiculo_id: null,
      estado: EstadoViaje.EN_CURSO,
      inicio_dispositivo: new Date('2026-10-04T14:00:00.000Z'),
      fin_dispositivo: null,
      creado_servidor: new Date(),
      cierre_recibido_servidor: null,
      ultima_recepcion_servidor: null,
      secuencia_final_esperada: null as string | null,
      cantidad_puntos: '3',
      ultima_secuencia_recibida: '3',
      revision_datos: '1',
      revision_ruta: '0',
      distancia_observada_m: null,
      duracion_monotonica_ms: null,
      observaciones: null,
    };

    let current = { ...row };

    const manager = {
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        managerQueries.push(sql);
        if (sql.includes('FOR UPDATE') || sql.includes('SELECT * FROM viajes')) {
          return [{ ...current }];
        }
        if (sql.includes('UPDATE viajes')) {
          current = {
            ...current,
            estado: params?.[5] as EstadoViaje,
            secuencia_final_esperada: String(params?.[2]),
            fin_dispositivo: new Date(params?.[1] as string),
          };
          return [];
        }
        return [];
      }),
    };

    const dataSource = {
      transaction: jest.fn(async (fn: (m: typeof manager) => Promise<unknown>) =>
        fn(manager),
      ),
    };

    const service = new ViajesService(
      dataSource as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
    );

    const sync = await service.finalizar(user, 'viaje-1', {
      finDispositivo: '2026-10-04T16:30:00.000Z',
      secuenciaFinalEsperada: 3,
    });

    expect(sync.estado).toBe(EstadoViaje.FINALIZADO);
    expect(sync.rangosFaltantes).toEqual([]);
  });
});
