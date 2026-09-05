export { Cuadrilla } from './cuadrilla.entity';
export { Obra } from './obra.entity';
export { RegistroAsistencia } from './registro-asistencia.entity';
export { Rol } from './rol.entity';
export { Turno } from './turno.entity';
export { Usuario } from './usuario.entity';

import { Cuadrilla } from './cuadrilla.entity';
import { Obra } from './obra.entity';
import { RegistroAsistencia } from './registro-asistencia.entity';
import { Rol } from './rol.entity';
import { Turno } from './turno.entity';
import { Usuario } from './usuario.entity';

export const entities = [
  Rol,
  Turno,
  Obra,
  Cuadrilla,
  Usuario,
  RegistroAsistencia,
];
