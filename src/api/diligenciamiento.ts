import { enviar, ErrorApi, obtener, solicitar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

/* Diligenciamiento del proyecto docente por secciones (EP-06). Cada sección se guarda sola. */

export type Diligenciamiento = Esquemas['DiligenciamientoDto'];
export type SeccionResumen = Esquemas['SeccionResumenDto'];
export type Descripcion = Esquemas['DescripcionDto'];
export type SeccionRac = Esquemas['SeccionRacDto'];
export type GrupoRac = Esquemas['GrupoRacDto'];
export type Rac = Esquemas['RacDto'];
export type DatosGuardarRac = Esquemas['GuardarRacDto'];

const base = (idProyecto: number) => `/proyectos-docentes/${idProyecto}`;

/** Qué secciones están completas y si el usuario puede editar (HU-06-08). */
export function consultarDiligenciamiento(
  idProyecto: number,
  senal?: AbortSignal,
) {
  return obtener<Diligenciamiento>(`${base(idProyecto)}/diligenciamiento`, {
    senal,
  });
}

/* Punto 2 · Descripción (RF-11) */

export function consultarDescripcion(idProyecto: number, senal?: AbortSignal) {
  return obtener<Descripcion>(`${base(idProyecto)}/descripcion`, { senal });
}

export function guardarDescripcion(idProyecto: number, texto: string) {
  return solicitar<Descripcion>(`${base(idProyecto)}/descripcion`, {
    metodo: 'PUT',
    cuerpo: { texto },
  });
}

/* Punto 3 · Resultados de aprendizaje del curso (RF-12) */

export function consultarRac(idProyecto: number, senal?: AbortSignal) {
  return obtener<SeccionRac>(`${base(idProyecto)}/rac`, { senal });
}

export function crearRac(idProyecto: number, datos: DatosGuardarRac) {
  return enviar<SeccionRac>(`${base(idProyecto)}/rac`, datos);
}

export function actualizarRac(
  idProyecto: number,
  idRac: number,
  datos: DatosGuardarRac,
) {
  return solicitar<SeccionRac>(`${base(idProyecto)}/rac/${idRac}`, {
    metodo: 'PUT',
    cuerpo: datos,
  });
}

export function eliminarRac(idProyecto: number, idRac: number) {
  return solicitar<SeccionRac>(`${base(idProyecto)}/rac/${idRac}`, {
    metodo: 'DELETE',
  });
}

/**
 * El servidor rechazó el cambio por permisos o por el estado del proyecto (403, 404, 409): el
 * resumen de la pantalla puede estar desactualizado y conviene volver a pedirlo.
 */
export function cambioRechazado(error: unknown): boolean {
  return (
    error instanceof ErrorApi &&
    (error.estado === 403 || error.estado === 404 || error.estado === 409)
  );
}

/** Nombre corto de un RAP: su código o, si no tiene, «RAP n». */
export function nombreRap(rap: {
  codigo?: string | null;
  numero?: number | null;
}): string {
  return rap.codigo ?? `RAP ${rap.numero ?? ''}`.trim();
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** Fecha y hora de Colombia, para «última modificación». */
export function fechaHora(iso: string | null | undefined): string | null {
  return iso ? formatoFecha.format(new Date(iso)) : null;
}
