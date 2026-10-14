import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { Obra } from '../entities';
import {
  ESTADOS_INCIDENCIA,
  ROL_ADMINISTRADOR,
  ROL_GUARDIA,
  TRANSICIONES_ESTADO,
  type EstadoIncidencia,
} from './incidencias.constants';

export type AmbitoIncidencias =
  | { tipo: 'administrador'; empresaId: string }
  | {
      tipo: 'guardia';
      usuarioId: string;
      obraId: string;
      empresaId: string | null;
    };

type ObraAcceso = Pick<Obra, 'id' | 'empresaId' | 'vigente'>;

/**
 * Ámbito de incidencias.
 * Administrador: obras de su empresa (`usuarios.empresaid` = `obras.empresaid`).
 * Guardia: únicamente la obra vigente de su cuadrilla, y solo si esa obra
 * no pertenece a otra empresa. No se reasignan cuadrillas existentes.
 */
export function resolverAmbito(
  user: AuthUser,
  cuadrilla: { obraId: string | null } | null,
  obraAsignada: ObraAcceso | null,
): AmbitoIncidencias {
  if (user.rolId === ROL_ADMINISTRADOR) {
    if (!user.empresaId) {
      throw new ForbiddenException('No tiene una empresa asignada');
    }
    return { tipo: 'administrador', empresaId: user.empresaId };
  }

  if (user.rolId === ROL_GUARDIA) {
    if (
      user.cuadrillaId == null ||
      !cuadrilla?.obraId ||
      !obraAsignada ||
      !obraAsignada.vigente ||
      obraAsignada.id !== cuadrilla.obraId
    ) {
      throw new ForbiddenException('No tiene una obra asignada');
    }

    if (
      user.empresaId &&
      obraAsignada.empresaId &&
      user.empresaId !== obraAsignada.empresaId
    ) {
      throw new ForbiddenException('No tiene acceso a esta obra');
    }

    return {
      tipo: 'guardia',
      usuarioId: user.id,
      obraId: obraAsignada.id,
      empresaId: user.empresaId,
    };
  }

  throw new ForbiddenException('No tiene permiso para operar incidencias');
}

export function obraPermitida(
  ambito: AmbitoIncidencias,
  obra: ObraAcceso,
): boolean {
  if (!obra.vigente) {
    return false;
  }

  if (ambito.tipo === 'administrador') {
    return obra.empresaId === ambito.empresaId;
  }

  if (obra.id !== ambito.obraId) {
    return false;
  }

  if (
    ambito.empresaId &&
    obra.empresaId &&
    ambito.empresaId !== obra.empresaId
  ) {
    return false;
  }

  return true;
}

export function incidenciaVisible(
  ambito: AmbitoIncidencias,
  incidencia: { usuarioId: string; obraId: string },
  obra: Pick<Obra, 'id' | 'empresaId'> | null,
): boolean {
  if (!obra || obra.id !== incidencia.obraId) {
    return false;
  }

  if (ambito.tipo === 'administrador') {
    return obra.empresaId === ambito.empresaId;
  }

  return (
    incidencia.usuarioId === ambito.usuarioId &&
    incidencia.obraId === ambito.obraId
  );
}

export function assertPuedeCambiarEstado(ambito: AmbitoIncidencias): void {
  if (ambito.tipo !== 'administrador') {
    throw new ForbiddenException(
      'Solo un administrador puede cambiar el estado de una incidencia',
    );
  }
}

export function assertTransicionEstado(
  actual: string,
  destino: string,
): EstadoIncidencia {
  if (!ESTADOS_INCIDENCIA.includes(destino as EstadoIncidencia)) {
    throw new BadRequestException('Estado de incidencia no permitido');
  }

  const esperado = TRANSICIONES_ESTADO[actual as EstadoIncidencia];
  if (esperado !== destino) {
    throw new BadRequestException(
      'Transición de estado no permitida. El orden es reportada → en_revision → resuelta',
    );
  }

  return destino;
}

/** El guardia solo anexa fotos a su incidencia mientras sigue reportada. */
export function assertPuedeAdjuntarFotos(
  ambito: AmbitoIncidencias,
  incidencia: { usuarioId: string; estado: string },
): void {
  if (ambito.tipo === 'guardia') {
    if (incidencia.usuarioId !== ambito.usuarioId) {
      throw new ForbiddenException('No tiene acceso a esta incidencia');
    }
    if (incidencia.estado !== 'reportada') {
      throw new ConflictException(
        'Solo se pueden añadir fotografías mientras la incidencia está reportada',
      );
    }
  }
}
