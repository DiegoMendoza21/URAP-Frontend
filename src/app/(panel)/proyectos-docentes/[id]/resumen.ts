import type { SeccionRac } from '@/api/diligenciamiento';
import type { MedicionResumen } from '@/api/mediciones';
import type { CalendarioSesiones } from '@/api/sesiones';

/** Tipo de sesión que desarrolla contenido (RF-21): las demás no se cuentan como clases. */
const TIPO_CLASE = 'clase';

/** «1 evidencia», «3 evidencias»: solo la palabra, para ir bajo el número. */
export function uno(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/**
 * Clases registradas y pendientes (RF-25). Pendiente es una clase de hoy o de antes que todavía
 * no se registró; las que aún no llegan no cuentan como atraso.
 */
export function textoClases(calendario: CalendarioSesiones): {
  principal: string;
  detalle: string;
  alerta: boolean;
} {
  const clases = calendario.elementos.filter(
    (sesion) => (sesion.tipo?.codigo ?? TIPO_CLASE) === TIPO_CLASE,
  );
  if (clases.length === 0) {
    return { principal: '—', detalle: 'sin calendario', alerta: false };
  }
  const registradas = clases.filter((sesion) => sesion.diligenciada).length;
  const pendientes = clases.filter(
    (sesion) => !sesion.diligenciada && sesion.fecha <= calendario.hoy,
  ).length;
  return {
    principal: `${registradas} de ${clases.length}`,
    detalle:
      pendientes === 0
        ? 'registradas, al día'
        : `registradas · ${pendientes} ${uno(pendientes, 'pendiente', 'pendientes')}`,
    alerta: pendientes > 0,
  };
}

/** Cuántos RAC tiene el proyecto y a cuántos RAP contribuye. Un RAC de dos RAP cuenta una vez. */
export function textoRacRap(
  seccion: SeccionRac,
  numeroRaps: number,
): { principal: string; detalle: string; alerta: boolean } {
  const racs = new Set(
    seccion.grupos.flatMap((grupo) => grupo.racs.map((rac) => rac.id)),
  ).size;
  return {
    principal: `${racs} RAC`,
    detalle: `para ${numeroRaps} RAP`,
    alerta: racs === 0 || seccion.rapsSinRac.length > 0,
  };
}

/** Las mediciones de RAP del curso (RF-30): cuántas, y cuántas siguen en borrador. */
export function textoMediciones(mediciones: MedicionResumen[]): {
  principal: string;
  detalle: string;
} {
  if (mediciones.length === 0) {
    return { principal: '0', detalle: 'sin mediciones' };
  }
  const cerradas = mediciones.filter((m) => m.estado === 'cerrada').length;
  const borrador = mediciones.length - cerradas;
  const partes = [
    cerradas > 0 ? `${cerradas} ${uno(cerradas, 'cerrada', 'cerradas')}` : null,
    borrador > 0 ? `${borrador} en borrador` : null,
  ].filter(Boolean);
  return { principal: String(mediciones.length), detalle: partes.join(' · ') };
}
