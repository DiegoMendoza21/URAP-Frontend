import type { SeccionResumen } from '@/api/diligenciamiento';

/**
 * HU-06-09: cómo se presenta el estado de cada sección que calcula el backend. «Vacía» es una
 * sección en la que el docente no ha registrado nada; «incompleta», una que tiene algo pero le
 * falta. El color acompaña siempre al texto: no es la única señal.
 */
export const ESTADOS_SECCION: Record<
  SeccionResumen['estado'],
  { texto: string; punto: string }
> = {
  completa: { texto: 'completa', punto: 'bg-emerald-500' },
  incompleta: { texto: 'incompleta', punto: 'bg-amber-400' },
  vacia: { texto: 'vacía', punto: 'bg-slate-300' },
};
