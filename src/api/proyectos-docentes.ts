import { enviar, obtener } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type ProgramaOpcion = Esquemas['ProgramaOpcionDto'];
export type AsignaturaOpcion = Esquemas['AsignaturaOpcionDto'];
export type DocenteOpcion = Esquemas['DocenteOpcionDto'];
export type RapOpcion = Esquemas['RapOpcionDto'];
export type InformacionAsignatura = Esquemas['InformacionAsignaturaDto'];
export type InformacionInstitucional = Esquemas['InformacionInstitucionalDto'];
export type ProyectoDocenteResumen = Esquemas['ProyectoDocenteResumenDto'];
export type ProyectoDocenteDetalle = Esquemas['ProyectoDocenteDetalleDto'];
export type PaginaProyectosDocentes = Esquemas['PaginaProyectosDocentesDto'];
export type ProyectoExistente = Esquemas['ProyectoExistenteDto'];
export type DatosCrearProyectoDocente = Esquemas['CrearProyectoDocenteDto'];

/** El formato FO-DO/PC-001 admite hasta tres docentes; el backend aplica el mismo límite. */
export const MAXIMO_DOCENTES = 3;

/* Asistente de creación (RF-08). Solo responde al Departamento académico de cada programa. */

export function consultarProgramas(senal?: AbortSignal) {
  return obtener<ProgramaOpcion[]>('/proyectos-docentes/asistente/programas', {
    senal,
  });
}

export function consultarAsignaturas(idPrograma: number, senal?: AbortSignal) {
  return obtener<AsignaturaOpcion[]>(
    `/proyectos-docentes/asistente/programas/${idPrograma}/asignaturas`,
    { senal },
  );
}

export function consultarDocentes(idPrograma: number, senal?: AbortSignal) {
  return obtener<DocenteOpcion[]>(
    `/proyectos-docentes/asistente/programas/${idPrograma}/docentes`,
    { senal },
  );
}

/** Información que se autocompleta (p5), período vigente y RAP del programa. */
export function consultarInformacionAsignatura(
  idAsignatura: number,
  senal?: AbortSignal,
) {
  return obtener<InformacionAsignatura>(
    `/proyectos-docentes/asistente/asignaturas/${idAsignatura}`,
    { senal },
  );
}

/** RF-08, p6: proyecto ya creado para la asignatura, el período vigente y el grupo. */
export function consultarProyectoExistente(
  idAsignatura: number,
  grupo: string,
  senal?: AbortSignal,
) {
  const consulta = new URLSearchParams({ idAsignatura: String(idAsignatura) });
  if (grupo.trim()) {
    consulta.set('grupo', grupo.trim());
  }
  return obtener<ProyectoExistente>(
    `/proyectos-docentes/asistente/proyecto-existente?${consulta}`,
    { senal },
  );
}

export function crearProyectoDocente(datos: DatosCrearProyectoDocente) {
  return enviar<ProyectoDocenteDetalle>('/proyectos-docentes', datos);
}

/* Consulta. El backend filtra por rol: el docente solo recibe los proyectos donde está asignado. */

export function consultarProyectosDocentes(
  pagina: number,
  tamano: number,
  senal?: AbortSignal,
) {
  return obtener<PaginaProyectosDocentes>(
    `/proyectos-docentes?pagina=${pagina}&tamano=${tamano}`,
    { senal },
  );
}

export function consultarProyectoDocente(id: number, senal?: AbortSignal) {
  return obtener<ProyectoDocenteDetalle>(`/proyectos-docentes/${id}`, {
    senal,
  });
}

/** Nombres y apellidos del docente, con lo que haya registrado. */
export function nombreDocente(docente: {
  nombres: string | null;
  apellidos: string | null;
}): string {
  return (
    [docente.nombres, docente.apellidos].filter(Boolean).join(' ') ||
    'Sin nombre'
  );
}

/**
 * Nombre corto de un plan de estudios para mostrarlo junto a la asignatura: «Plan 2502». La
 * misma asignatura puede estar en dos planes con códigos distintos (modelo v2.5).
 */
export function etiquetaPlan(plan: {
  codigo: string | null;
  nombre: string | null;
}): string {
  return plan.codigo
    ? `Plan ${plan.codigo}`
    : (plan.nombre ?? 'Plan sin código');
}
