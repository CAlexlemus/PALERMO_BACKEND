import type { Incidencia } from './entities/incidencia.entity';
import type { IncidenciaFoto } from './entities/incidencia-foto.entity';

export type FotoResumen = {
  id: string;
  nombre_archivo: string | null;
  tipo_mime: string | null;
};

export type FotoDetalle = FotoResumen & {
  fecha_registro: string;
  url: string;
};

export type IncidenciaCreada = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  obra_id: string;
  usuario_id: string;
  fecha_registro: string;
  fotos: FotoResumen[];
};

export type IncidenciaListada = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  fecha_registro: string;
  obra_id: string;
  usuario_id: string;
  nombreusuario: string;
  cantidad_fotos: number;
};

export function aIso(valor: Date | string): string {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return fecha.toISOString();
}

export function presentarFoto(foto: IncidenciaFoto): FotoResumen {
  return {
    id: foto.id,
    nombre_archivo: foto.nombreArchivo,
    tipo_mime: foto.tipoMime,
  };
}

export function presentarIncidencia(
  incidencia: Incidencia,
  fotos: IncidenciaFoto[],
): IncidenciaCreada {
  return {
    id: incidencia.id,
    titulo: incidencia.titulo,
    descripcion: incidencia.descripcion,
    estado: incidencia.estado,
    obra_id: incidencia.obraId,
    usuario_id: incidencia.usuarioId,
    fecha_registro: aIso(incidencia.fechaRegistro),
    fotos: fotos.map(presentarFoto),
  };
}
