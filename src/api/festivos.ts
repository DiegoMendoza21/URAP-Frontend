import { enviar, obtener, solicitar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

/*
 * Días festivos y días sin clase de la Universidad (RF-19, HU-08-01). El backend decide quién
 * los administra (el permiso `estructura.administrar`), calcula los festivos de ley y recalcula
 * los calendarios después de cada cambio: aquí solo se presentan y se envían los cambios.
 */

export type Festivo = Esquemas['FestivoDto'];
export type ListaFestivos = Esquemas['ListaFestivosDto'];
export type DatosCrearFestivo = Esquemas['CrearFestivoDto'];
export type DatosEditarFestivo = Esquemas['EditarFestivoDto'];
export type ResultadoFestivo = Esquemas['ResultadoFestivoDto'];
export type ResultadoCargaLey = Esquemas['ResultadoCargaLeyDto'];
export type OrigenFestivo = NonNullable<DatosCrearFestivo['origen']>;

/** Los orígenes de un día sin clase, en el orden en que se ofrecen al agregar uno. */
export const ORIGENES: readonly { valor: OrigenFestivo; nombre: string }[] = [
  { valor: 'institucional', nombre: 'Día no hábil de la Universidad' },
  { valor: 'ley', nombre: 'Festivo de ley' },
  { valor: 'ajuste_manual', nombre: 'Ajuste manual' },
];

export function nombreOrigen(origen: string | null): string {
  return (
    ORIGENES.find((opcion) => opcion.valor === origen)?.nombre ?? 'Sin origen'
  );
}

export function consultarFestivos(anio: number, senal?: AbortSignal) {
  return obtener<ListaFestivos>(`/festivos?anio=${anio}`, { senal });
}

/** Agrega los festivos de ley del año que falten (Ley 51 de 1983). */
export function cargarFestivosDeLey(anio: number) {
  return enviar<ResultadoCargaLey>('/festivos/ley', { anio });
}

export function crearFestivo(datos: DatosCrearFestivo) {
  return enviar<ResultadoFestivo>('/festivos', datos);
}

export function editarFestivo(id: number, datos: DatosEditarFestivo) {
  return solicitar<ResultadoFestivo>(`/festivos/${id}`, {
    metodo: 'PATCH',
    cuerpo: datos,
  });
}

/** Si el día marca sesiones, el backend pide `confirmar` (409). */
export function eliminarFestivo(id: number, confirmar: boolean) {
  return solicitar<ResultadoFestivo>(
    `/festivos/${id}${confirmar ? '?confirmar=true' : ''}`,
    { metodo: 'DELETE' },
  );
}

/** «Se recalcularon 3 calendarios», o nada si no hubo que recalcular. */
export function textoRecalculo(calendarios: number): string {
  if (calendarios === 0) {
    return '';
  }
  return calendarios === 1
    ? ' Se recalculó 1 calendario de sesiones.'
    : ` Se recalcularon ${calendarios} calendarios de sesiones.`;
}
