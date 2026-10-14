export { Incidencia } from '../incidencias/entities/incidencia.entity';
export { IncidenciaFoto } from '../incidencias/entities/incidencia-foto.entity';
export { Cuadrilla } from './cuadrilla.entity';
export { Dispositivo } from './dispositivo.entity';
export { Empresa } from './empresa.entity';
export { Obra } from './obra.entity';
export { PuntoViaje } from './punto-viaje.entity';
export { RegistroAsistencia } from './registro-asistencia.entity';
export { Rol } from './rol.entity';
export { SegmentoViaje } from './segmento-viaje.entity';
export { Turno } from './turno.entity';
export { Usuario } from './usuario.entity';
export { Vehiculo } from './vehiculo.entity';
export { Viaje } from './viaje.entity';

import { Incidencia } from '../incidencias/entities/incidencia.entity';
import { IncidenciaFoto } from '../incidencias/entities/incidencia-foto.entity';
import { Cuadrilla } from './cuadrilla.entity';
import { Dispositivo } from './dispositivo.entity';
import { Empresa } from './empresa.entity';
import { Obra } from './obra.entity';
import { PuntoViaje } from './punto-viaje.entity';
import { RegistroAsistencia } from './registro-asistencia.entity';
import { Rol } from './rol.entity';
import { SegmentoViaje } from './segmento-viaje.entity';
import { Turno } from './turno.entity';
import { Usuario } from './usuario.entity';
import { Vehiculo } from './vehiculo.entity';
import { Viaje } from './viaje.entity';

export const entities = [
  Rol,
  Turno,
  Empresa,
  Obra,
  Cuadrilla,
  Usuario,
  Dispositivo,
  Vehiculo,
  RegistroAsistencia,
  Viaje,
  PuntoViaje,
  SegmentoViaje,
  Incidencia,
  IncidenciaFoto,
];
