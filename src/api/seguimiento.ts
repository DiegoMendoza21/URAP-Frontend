import { obtener } from './cliente';
import { descargarArchivo } from './descargas';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type FiltrosSeguimiento = Esquemas['FiltrosSeguimientoDto'];
export type PaginaSeguimiento = Esquemas['PaginaSeguimientoDto'];
export type ProyectoSeguimiento = Esquemas['ProyectoSeguimientoDto'];
export type ColorSemaforo = ProyectoSeguimiento['color'];

/*
 * Tablero de seguimiento del diligenciamiento (RF-25). El backend aplica el alcance (los
 * programas del rol) y calcula todos los indicadores y el color: aquí solo se presentan.
 */

export interface FiltroSeguimiento {
  idPeriodo?: number;
  idPrograma?: number;
  idAsignatura?: number;
  idDocente?: number;
}

export type VistaSeguimiento = 'tablero' | 'pendientes';

function parametros(
  filtro: FiltroSeguimiento,
  extra: Record<string, string> = {},
): URLSearchParams {
  const consulta = new URLSearchParams(extra);
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor) {
      consulta.set(clave, String(valor));
    }
  }
  return consulta;
}

export function consultarFiltrosSeguimiento(senal?: AbortSignal) {
  return obtener<FiltrosSeguimiento>('/seguimiento/filtros', { senal });
}

/**
 * La consulta paginada. Con `exportar: 'pdf'` (HU-12-06), el backend aplica el máximo de filas
 * exportables (422 si lo supera) y registra la generación: se pide así una sola vez, antes de
 * imprimir.
 */
export function consultarSeguimiento(
  vista: VistaSeguimiento,
  filtro: FiltroSeguimiento,
  pagina: number,
  tamano: number,
  senal?: AbortSignal,
  exportar?: 'pdf',
) {
  const consulta = parametros(filtro, {
    pagina: String(pagina),
    tamano: String(tamano),
    ...(exportar ? { exportar } : {}),
  });
  return obtener<PaginaSeguimiento>(`/seguimiento/${vista}?${consulta}`, {
    senal,
  });
}

export function descargarSeguimientoExcel(
  vista: VistaSeguimiento,
  filtro: FiltroSeguimiento,
) {
  return descargarArchivo(
    `/seguimiento/${vista}/excel?${parametros(filtro)}`,
    `${vista}.xlsx`,
  );
}
