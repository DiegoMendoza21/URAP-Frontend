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

/* Reportes académicos (RF-28). Cada consulta queda registrada en el backend (p6). */

export type ReporteCumplimiento = Esquemas['ReporteCumplimientoDto'];
export type ReporteContribucion = Esquemas['ReporteContribucionDto'];
export type RapContribucion = Esquemas['RapContribucionDto'];

export interface ConsultaCumplimiento {
  idPeriodo?: number;
  idPrograma?: number;
  idAsignatura?: number;
  idDocente?: number;
  estado?: string;
}

export interface ConsultaContribucion {
  idPeriodo?: number;
  idRap?: number;
}

function filtrosComoParametros(
  filtros: Record<string, string | number | undefined>,
): URLSearchParams {
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') {
      consulta.set(clave, String(valor));
    }
  }
  return consulta;
}

export function consultarCumplimiento(
  filtros: ConsultaCumplimiento,
  senal?: AbortSignal,
) {
  return obtener<ReporteCumplimiento>(
    `/reportes/cumplimiento?${filtrosComoParametros({ ...filtros })}`,
    { senal },
  );
}

export function descargarCumplimientoExcel(filtros: ConsultaCumplimiento) {
  return descargarArchivo(
    `/reportes/cumplimiento/excel?${filtrosComoParametros({ ...filtros })}`,
    'cumplimiento.xlsx',
  );
}

export function consultarContribucion(
  filtros: ConsultaContribucion,
  senal?: AbortSignal,
) {
  return obtener<ReporteContribucion>(
    `/reportes/contribucion-rac-rap?${filtrosComoParametros({ ...filtros })}`,
    { senal },
  );
}

export function descargarContribucionExcel(filtros: ConsultaContribucion) {
  return descargarArchivo(
    `/reportes/contribucion-rac-rap/excel?${filtrosComoParametros({ ...filtros })}`,
    'contribucion-rac-rap.xlsx',
  );
}
