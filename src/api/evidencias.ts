import { avisarSesionInvalida } from '@/sesion/eventos';
import { ErrorApi, errorDeRespuesta, MENSAJES, obtener } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type OpcionesEvidencias = Esquemas['OpcionesEvidenciasDto'];
export type RapEvidencias = Esquemas['RapEvidenciasDto'];
export type SesionEvidencia = Esquemas['SesionEvidenciaDto'];
export type Evidencia = Esquemas['EvidenciaDto'];
export type PaginaEvidencias = Esquemas['PaginaEvidenciasDto'];
export type CargaEvidencias = Esquemas['CargaEvidenciasDto'];

/* Evidencias fotográficas por RAP (RF-24). El backend decide quién ve y quién carga. */

export function consultarOpcionesEvidencias(
  idProyecto: number,
  senal?: AbortSignal,
) {
  return obtener<OpcionesEvidencias>(
    `/proyectos-docentes/${idProyecto}/evidencias/opciones`,
    { senal },
  );
}

/** p6: galería de un RAP, las más recientes primero. */
export function consultarEvidencias(
  idProyecto: number,
  idRap: number,
  pagina: number,
  tamano: number,
  senal?: AbortSignal,
) {
  const consulta = new URLSearchParams({
    idRap: String(idRap),
    pagina: String(pagina),
    tamano: String(tamano),
  });
  return obtener<PaginaEvidencias>(
    `/proyectos-docentes/${idProyecto}/evidencias?${consulta}`,
    { senal },
  );
}

/**
 * Dirección del archivo de una evidencia en este mismo servidor. El servidor de Next la
 * reenvía al backend con la sesión: el archivo nunca es público (NFR-007).
 */
export function urlArchivoEvidencia(idProyecto: number, idEvidencia: number) {
  return `/api/proyectos-docentes/${idProyecto}/evidencias/${idEvidencia}/archivo`;
}

export interface DatosCargaEvidencias {
  idRap: number;
  descripcion: string;
  fecha: string;
  idSesion?: number;
  archivos: readonly File[];
}

/** Espera mínima de una carga, más un margen por cada MB: depende de la señal del teléfono. */
const TIEMPO_BASE_MS = 30_000;
const TIEMPO_POR_MB_MS = 10_000;

/**
 * p3 a p5: carga uno o varios archivos con la misma descripción, fecha y sesión. Usa
 * XMLHttpRequest y no fetch porque solo así el navegador informa el avance de la subida, que
 * con datos móviles puede tardar. Si falla, lanza ErrorApi con el mensaje del backend (el
 * límite de tamaño, el tipo no permitido, la falla del almacenamiento…).
 */
export function cargarEvidencias(
  idProyecto: number,
  datos: DatosCargaEvidencias,
  alAvanzar?: (fraccion: number) => void,
): Promise<CargaEvidencias> {
  const formulario = new FormData();
  formulario.set('idRap', String(datos.idRap));
  formulario.set('descripcion', datos.descripcion);
  formulario.set('fecha', datos.fecha);
  if (datos.idSesion !== undefined) {
    formulario.set('idSesion', String(datos.idSesion));
  }
  for (const archivo of datos.archivos) {
    formulario.append('archivos', archivo, archivo.name);
  }
  const megas =
    datos.archivos.reduce((total, archivo) => total + archivo.size, 0) /
    (1024 * 1024);

  return new Promise((resolver, rechazar) => {
    const peticion = new XMLHttpRequest();
    peticion.open('POST', `/api/proyectos-docentes/${idProyecto}/evidencias`);
    peticion.setRequestHeader('Accept', 'application/json');
    peticion.timeout = TIEMPO_BASE_MS + Math.ceil(megas) * TIEMPO_POR_MB_MS;
    peticion.upload.onprogress = (evento) => {
      if (evento.lengthComputable && evento.total > 0) {
        alAvanzar?.(evento.loaded / evento.total);
      }
    };
    peticion.onload = () => {
      let cuerpo: unknown;
      try {
        cuerpo = JSON.parse(peticion.responseText);
      } catch {
        cuerpo = undefined;
      }
      if (peticion.status >= 200 && peticion.status < 300 && cuerpo) {
        resolver(cuerpo as CargaEvidencias);
        return;
      }
      if (peticion.status === 401) {
        avisarSesionInvalida();
      }
      rechazar(errorDeRespuesta(peticion.status, cuerpo));
    };
    peticion.onerror = () => rechazar(new ErrorApi(MENSAJES.sinConexion));
    peticion.ontimeout = () => rechazar(new ErrorApi(MENSAJES.tiempoAgotado));
    peticion.send(formulario);
  });
}
