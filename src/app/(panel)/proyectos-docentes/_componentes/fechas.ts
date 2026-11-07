/*
 * Formato de las fechas del calendario de sesiones. Llegan del backend como `YYYY-MM-DD` y se
 * leen en UTC, para que no cambien de día con la zona horaria del teléfono.
 */

const formatoFechaLarga = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const formatoFechaCorta = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const formatoMomento = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/** `2026-11-04` → «miércoles, 4 de noviembre». */
export function fechaLarga(fecha: string): string {
  return formatoFechaLarga.format(new Date(`${fecha}T00:00:00Z`));
}

/** `2026-11-04` → «4 nov». */
export function fechaCorta(fecha: string): string {
  return formatoFechaCorta.format(new Date(`${fecha}T00:00:00Z`));
}

/** Un instante ISO (por ejemplo, cuándo se registró la clase), en la hora de Colombia. */
export function momento(instante: string): string {
  return formatoMomento.format(new Date(instante));
}
