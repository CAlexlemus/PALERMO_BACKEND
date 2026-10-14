/** Catálogo real de `roles`: 1 Administrador, 2 Guardia. */
export const ROL_ADMINISTRADOR = 1;
export const ROL_GUARDIA = 2;

export const ESTADOS_INCIDENCIA = [
  'reportada',
  'en_revision',
  'resuelta',
] as const;

export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[number];

export const MAX_FOTOS_POR_INCIDENCIA = 5;
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
export const URL_FIRMADA_SEGUNDOS = 300;

export const TRANSICIONES_ESTADO: Partial<
  Record<EstadoIncidencia, EstadoIncidencia>
> = {
  reportada: 'en_revision',
  en_revision: 'resuelta',
};
