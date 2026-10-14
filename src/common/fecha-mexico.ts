/** Zona de las marcas de asistencia. México ya no aplica horario de verano. */
export const ZONA_HORARIA_ASISTENCIA = 'America/Mexico_City';

/**
 * Date cuyo reloj local coincide con el instante en America/Mexico_City.
 * El driver de Postgres escribe esas cifras en columnas `timestamp` sin zona,
 * así que la base muestra la hora en que se tomó la asistencia.
 */
export function relojMexico(instante: Date): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA_ASISTENCIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instante);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value);

  let hora = valor('hour');
  if (hora === 24) {
    hora = 0;
  }

  return new Date(
    valor('year'),
    valor('month') - 1,
    valor('day'),
    hora,
    valor('minute'),
    valor('second'),
    instante.getMilliseconds(),
  );
}

/** Texto `YYYY-MM-DD HH:mm:ss.SSS` con el reloj de America/Mexico_City. */
export function textoRelojMexico(instante: Date): string {
  const reloj = relojMexico(instante);
  const pad = (numero: number, ancho = 2) => String(numero).padStart(ancho, '0');

  return (
    `${reloj.getFullYear()}-${pad(reloj.getMonth() + 1)}-${pad(reloj.getDate())} ` +
    `${pad(reloj.getHours())}:${pad(reloj.getMinutes())}:${pad(reloj.getSeconds())}.` +
    `${pad(reloj.getMilliseconds(), 3)}`
  );
}
