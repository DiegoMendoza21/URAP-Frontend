import { avisarSesionInvalida } from '@/sesion/eventos';
import { ErrorApi, obtener } from './cliente';
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

/** Mismo límite que las demás solicitudes a la API (src/api/cliente.ts). */
const TIEMPO_LIMITE_MS = 15_000;

/**
 * Descarga el reporte en Excel (RF-32, p5). Pasa por /api como todo lo demás: el token sigue
 * en la cookie httpOnly. Devuelve el archivo y el nombre que propone el backend.
 */
export async function descargarLogroRapExcel(
  consulta: ConsultaLogroRap,
): Promise<{ archivo: Blob; nombre: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch(
      `/api/reportes/logro-rap/excel?${parametros(consulta)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(TIEMPO_LIMITE_MS) },
    );
  } catch (error) {
    throw new ErrorApi(
      error instanceof DOMException && error.name === 'TimeoutError'
        ? 'El servidor de URAP tardó demasiado en responder. Intente de nuevo en unos minutos.'
        : 'No fue posible conectar con el servidor de URAP. Revise su conexión e intente de nuevo.',
    );
  }
  if (!respuesta.ok) {
    // Igual que el resto de solicitudes: con la sesión vencida, se vuelve al inicio de sesión.
    if (respuesta.status === 401) {
      avisarSesionInvalida();
    }
    const cuerpo: unknown = await respuesta.json().catch(() => undefined);
    const mensaje =
      typeof cuerpo === 'object' &&
      cuerpo !== null &&
      typeof (cuerpo as { mensaje?: unknown }).mensaje === 'string'
        ? (cuerpo as { mensaje: string }).mensaje
        : 'No fue posible generar el archivo de Excel.';
    throw new ErrorApi(mensaje, respuesta.status);
  }
  const disposicion = respuesta.headers.get('content-disposition') ?? '';
  const nombre =
    /filename="([^"]+)"/.exec(disposicion)?.[1] ?? 'logro-rap.xlsx';
  return { archivo: await respuesta.blob(), nombre };
}
