import { enviar, obtener, solicitar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type BloqueHorario = Esquemas['BloqueHorarioDto'];
export type HorarioCurso = Esquemas['HorarioCursoDto'];
export type DatosGuardarHorario = Esquemas['GuardarHorarioDto'];
export type SesionCalendario = Esquemas['SesionCalendarioDto'];
export type CalendarioSesiones = Esquemas['CalendarioSesionesDto'];
export type ResultadoGeneracion = Esquemas['ResultadoGeneracionDto'];

/** Días en que puede haber clase (RF-19): 1 = lunes … 6 = sábado, como en el backend. */
export const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
] as const;

export function nombreDia(dia: number): string {
  return DIAS_SEMANA.find((opcion) => opcion.valor === dia)?.nombre ?? '';
}

/**
 * Calendario completo: un curso tiene a lo sumo 6 sesiones por semana, así que una página de
 * 200 alcanza para cualquier período.
 */
const TAMANO_CALENDARIO = 200;

/* Horario del curso (HU-08-02) y calendario de sesiones (HU-08-03), RF-19. */

export function consultarHorario(idProyecto: number, senal?: AbortSignal) {
  return obtener<HorarioCurso>(`/proyectos-docentes/${idProyecto}/horario`, {
    senal,
  });
}

export function guardarHorario(idProyecto: number, datos: DatosGuardarHorario) {
  return solicitar<HorarioCurso>(`/proyectos-docentes/${idProyecto}/horario`, {
    metodo: 'PUT',
    cuerpo: datos,
  });
}

export function consultarCalendario(idProyecto: number, senal?: AbortSignal) {
  return obtener<CalendarioSesiones>(
    `/proyectos-docentes/${idProyecto}/calendario?tamano=${TAMANO_CALENDARIO}`,
    { senal },
  );
}

/** Genera el calendario o, si ya existe, recalcula las sesiones sin diligenciar. */
export function generarCalendario(idProyecto: number) {
  return enviar<ResultadoGeneracion>(
    `/proyectos-docentes/${idProyecto}/calendario`,
  );
}
