const formatoMomento = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/** Un instante ISO en la hora de Colombia: «11 de nov de 2026, 2:44 a. m.». Nulo si no hay. */
export function momento(fecha: string | null): string | null {
  return fecha ? formatoMomento.format(new Date(fecha)) : null;
}
