import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/types/auth-user.type';
import {
  assertPuedeAdjuntarFotos,
  assertPuedeCambiarEstado,
  assertTransicionEstado,
  incidenciaVisible,
  obraPermitida,
  resolverAmbito,
} from './incidencias.access';

function usuario(partial: Partial<AuthUser>): AuthUser {
  return {
    id: 'usuario-1',
    nombreUsuario: 'carlos',
    rolId: 2,
    jefeId: null,
    cuadrillaId: 10,
    turnoId: null,
    empresaId: 'empresa-1',
    requiereFoto: null,
    requiereUbicacion: null,
    ...partial,
  };
}

const obraPropia = {
  id: 'obra-1',
  empresaId: 'empresa-1',
  vigente: true,
};

describe('ámbito de incidencias', () => {
  it('limita al guardia a la obra de su cuadrilla y a su empresa', () => {
    const ambito = resolverAmbito(
      usuario({}),
      { obraId: 'obra-1' },
      obraPropia,
    );

    expect(obraPermitida(ambito, obraPropia)).toBe(true);
    expect(
      obraPermitida(ambito, {
        id: 'obra-2',
        empresaId: 'empresa-1',
        vigente: true,
      }),
    ).toBe(false);
    expect(
      incidenciaVisible(
        ambito,
        { usuarioId: 'usuario-1', obraId: 'obra-1' },
        obraPropia,
      ),
    ).toBe(true);
    expect(
      incidenciaVisible(
        ambito,
        { usuarioId: 'otro', obraId: 'obra-1' },
        obraPropia,
      ),
    ).toBe(false);
  });

  it('niega la cuadrilla que apunta a una obra de otra empresa', () => {
    expect(() =>
      resolverAmbito(
        usuario({}),
        { obraId: 'obra-ajena' },
        {
          id: 'obra-ajena',
          empresaId: 'empresa-2',
          vigente: true,
        },
      ),
    ).toThrow(ForbiddenException);
  });

  it('limita al administrador a las obras de su empresa', () => {
    const ambito = resolverAmbito(
      usuario({ rolId: 1, cuadrillaId: null }),
      null,
      null,
    );

    expect(
      obraPermitida(ambito, {
        id: 'obra-2',
        empresaId: 'empresa-1',
        vigente: true,
      }),
    ).toBe(true);
    expect(
      obraPermitida(ambito, {
        id: 'obra-3',
        empresaId: 'empresa-2',
        vigente: true,
      }),
    ).toBe(false);
    expect(() => assertPuedeCambiarEstado(ambito)).not.toThrow();
  });

  it('impide que el guardia cambie el estado o anexe fotos fuera de reportada', () => {
    const ambito = resolverAmbito(
      usuario({}),
      { obraId: 'obra-1' },
      obraPropia,
    );
    expect(() => assertPuedeCambiarEstado(ambito)).toThrow(ForbiddenException);
    expect(() =>
      assertPuedeAdjuntarFotos(ambito, {
        usuarioId: 'usuario-1',
        estado: 'en_revision',
      }),
    ).toThrow(ConflictException);
  });

  it('solo permite reportada → en_revision → resuelta', () => {
    expect(assertTransicionEstado('reportada', 'en_revision')).toBe(
      'en_revision',
    );
    expect(assertTransicionEstado('en_revision', 'resuelta')).toBe('resuelta');
    expect(() => assertTransicionEstado('reportada', 'resuelta')).toThrow(
      BadRequestException,
    );
    expect(() => assertTransicionEstado('resuelta', 'en_revision')).toThrow(
      BadRequestException,
    );
  });
});
