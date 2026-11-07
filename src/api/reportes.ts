import { obtener } from './cliente';
import { descargarArchivo } from './descargas';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type FiltrosLogroRap = Esquemas['FiltrosLogroRapDto'];
export type ReporteLogroRap = Esquemas['ReporteLogroRapDto'];
export type RapReporte = Esquemas['RapReporteDto'];
export type AsignaturaEvaluada = Esquemas['AsignaturaEvaluadaDto'];

/*
 * Reporte de logro de los RAP del programa (RF-32). El backend aplica el alcance: el programa
 * del rol, o solo los RAP que lidera el líder RAP. Solo datos agregados.
 */

export interface ConsultaLogroRap {
  idPrograma: number;
  idPeriodo: number;
  idRap?: number;
}

function parametros({ idPrograma, idPeriodo, idRap }: ConsultaLogroRap) {
  const consulta = new URLSearchParams({
    idPrograma: String(idPrograma),
    idPeriodo: String(idPeriodo),
  });
  if (idRap) {
    consulta.set('idRap', String(idRap));
  }
  return consulta;
}

export function consultarFiltrosLogroRap(senal?: AbortSignal) {
  return obtener<FiltrosLogroRap>('/reportes/logro-rap/filtros', { senal });
}

export function consultarLogroRap(
  consulta: ConsultaLogroRap,
  senal?: AbortSignal,
) {
  return obtener<ReporteLogroRap>(
    `/reportes/logro-rap?${parametros(consulta)}`,
    { senal },
  );
}

/** Descarga el reporte en Excel (RF-32, p5). */
export function descargarLogroRapExcel(consulta: ConsultaLogroRap) {
  return descargarArchivo(
    `/reportes/logro-rap/excel?${parametros(consulta)}`,
    'logro-rap.xlsx',
  );
}
