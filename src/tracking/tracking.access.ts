import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { Viaje } from '../entities';

/** Exige empresaId en el JWT/usuario. */
export function requireEmpresaId(user: AuthUser): string {
  if (!user.empresaId) {
    throw new UnprocessableEntityException(
      'El usuario autenticado no tiene empresa asignada',
    );
  }
  return user.empresaId;
}

/** Lectura: misma empresa. */
export function assertCanReadViaje(user: AuthUser, viaje: Viaje): void {
  const empresaId = requireEmpresaId(user);
  if (viaje.empresaId !== empresaId) {
    throw new ForbiddenException('No tiene acceso a este viaje');
  }
}

/** Escritura (puntos/finalizar): solo el piloto asignado + misma empresa. */
export function assertCanWriteViaje(user: AuthUser, viaje: Viaje): void {
  assertCanReadViaje(user, viaje);
  if (viaje.pilotoId !== user.id) {
    throw new ForbiddenException(
      'Solo el piloto asignado puede modificar este viaje',
    );
  }
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === 'number' ? value : Number(value);
}
