import { enviar, obtener, solicitar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

/*
 * Revisión y aprobación del proyecto docente (EP-07, RF-17 y RF-18). El backend decide quién
 * envía (el docente responsable) y quién revisa (quien tiene `proyectos.aprobar` en el
 * programa); aquí solo se presentan sus respuestas.
 */

export type VerificacionEnvio = Esquemas['VerificacionEnvioDto'];
export type SeccionIncompleta = Esquemas['SeccionIncompletaDto'];
export type TransicionProyecto = Esquemas['TransicionProyectoDto'];
export type PaginaPendientesRevision = Esquemas['PaginaPendientesRevisionDto'];
export type PendienteRevision = Esquemas['PendienteRevisionDto'];
export type VerificacionRevision = Esquemas['VerificacionRevisionDto'];
export type ObservacionEntrada = Esquemas['ObservacionEntradaDto'];
export type Observacion = Esquemas['ObservacionDto'];
export type ObservacionesProyecto = Esquemas['ObservacionesProyectoDto'];
export type EventoRevision = Esquemas['EventoRevisionDto'];
export type Persona = Esquemas['PersonaDto'];

const base = (idProyecto: number) => `/proyectos-docentes/${idProyecto}`;

/* RF-17 · Envío a revisión (HU-07-01) */

/** Lo que falta antes de enviar y las observaciones sin resolver (p2 y p3). */
export function verificarEnvio(idProyecto: number, senal?: AbortSignal) {
  return obtener<VerificacionEnvio>(`${base(idProyecto)}/envio`, { senal });
}

export function enviarARevision(idProyecto: number) {
  return enviar<TransicionProyecto>(`${base(idProyecto)}/envio`);
}

/* RF-18 · Revisión (HU-07-02 a HU-07-04) */

/**
 * Por si el backend marca un proyecto como no revisable sin decir por qué. Hoy siempre lo dice:
 * con la separación de funciones encendida, quien es docente del proyecto no lo revisa.
 */
export const MOTIVO_NO_REVISABLE =
  'Usted no puede revisar este proyecto: debe revisarlo otra persona del Departamento.';

export interface FiltroRevision {
  idPrograma?: number;
  idAsignatura?: number;
  idDocente?: number;
}

export function consultarPendientesRevision(
  filtro: FiltroRevision,
  pagina: number,
  tamano: number,
  senal?: AbortSignal,
) {
  const consulta = new URLSearchParams({
    pagina: String(pagina),
    tamano: String(tamano),
  });
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor) {
      consulta.set(clave, String(valor));
    }
  }
  return obtener<PaginaPendientesRevision>(
    `/revisiones/pendientes?${consulta}`,
    { senal },
  );
}

/**
 * Si el usuario puede aprobar o devolver el proyecto ahora y, si no, por qué: por ejemplo, es
 * docente del proyecto y debe revisarlo otra persona del Departamento.
 */
export function verificarRevision(idProyecto: number, senal?: AbortSignal) {
  return obtener<VerificacionRevision>(`${base(idProyecto)}/revision`, {
    senal,
  });
}

export function aprobarProyecto(
  idProyecto: number,
  observacionGeneral?: string,
) {
  return enviar<TransicionProyecto>(`${base(idProyecto)}/aprobacion`, {
    observacionGeneral,
  } satisfies Esquemas['AprobarProyectoDto']);
}

export function devolverProyecto(
  idProyecto: number,
  observaciones: ObservacionEntrada[],
  observacionGeneral?: string,
) {
  return enviar<TransicionProyecto>(`${base(idProyecto)}/devolucion`, {
    observacionGeneral,
    observaciones,
  } satisfies Esquemas['DevolverProyectoDto']);
}

/* HU-07-05 · Observaciones de la devolución */

export function consultarObservaciones(
  idProyecto: number,
  senal?: AbortSignal,
) {
  return obtener<ObservacionesProyecto>(`${base(idProyecto)}/observaciones`, {
    senal,
  });
}

export function marcarObservacion(
  idProyecto: number,
  idObservacion: number,
  resuelta: boolean,
) {
  return solicitar<Observacion>(
    `${base(idProyecto)}/observaciones/${idObservacion}`,
    {
      metodo: 'PATCH',
      cuerpo: { resuelta } satisfies Esquemas['MarcarObservacionDto'],
    },
  );
}

/* HU-07-06 · Historial de revisiones */

export function consultarHistorial(idProyecto: number, senal?: AbortSignal) {
  return obtener<EventoRevision[]>(`${base(idProyecto)}/historial`, { senal });
}

/** Las firmas del formato que sustituye cada evento del historial. */
export const FIRMA_EVENTO: Record<string, string> = {
  elaboracion: 'Elaboró',
  revision: 'Revisó',
  aprobacion: 'Aprobó',
};

export const RESULTADO_EVENTO: Record<string, string> = {
  enviado: 'Enviado a revisión',
  devuelto: 'Devuelto con observaciones',
  aprobado: 'Aprobado',
};

export function nombrePersona(persona: Persona | null): string {
  if (!persona) {
    return 'Usuario no disponible';
  }
  return (
    [persona.nombres, persona.apellidos].filter(Boolean).join(' ') ||
    'Usuario sin nombre'
  );
}
