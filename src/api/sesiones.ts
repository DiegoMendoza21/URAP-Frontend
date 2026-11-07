import { enviar, obtener, solicitar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type BloqueHorario = Esquemas['BloqueHorarioDto'];
export type HorarioCurso = Esquemas['HorarioCursoDto'];
export type DatosGuardarHorario = Esquemas['GuardarHorarioDto'];
export type SesionCalendario = Esquemas['SesionCalendarioDto'];
export type CalendarioSesiones = Esquemas['CalendarioSesionesDto'];
export type ResultadoGeneracion = Esquemas['ResultadoGeneracionDto'];
export type TipoAlertaSesion = Esquemas['TipoAlertaSesion'];
export type ResumenAlertas = Esquemas['ResumenAlertasDto'];
export type PendientesDocente = Esquemas['PendientesDocenteDto'];
export type ProyectoConPendientes = Esquemas['ProyectoConPendientesDto'];
export type DetalleSesion = Esquemas['DetalleSesionDto'];
export type TemaContenido = Esquemas['TemaContenidoDto'];
export type EstudianteSesion = Esquemas['EstudianteSesionDto'];
export type DatosRegistrarSesion = Esquemas['RegistrarSesionDto'];

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

/**
 * RF-23, p5: vencidas y por vencer de los proyectos del docente que consulta, para su panel.
 * El backend decide qué está vencido y con qué umbral; aquí solo se muestra.
 */
export function consultarPendientes(senal?: AbortSignal) {
  return obtener<PendientesDocente>('/sesiones/pendientes?pagina=1&tamano=20', {
    senal,
  });
}

/** Días de atraso de una sesión vencida, en palabras (RF-23, p3). */
export function textoAtraso(dias: number): string {
  return dias === 1 ? '1 día de atraso' : `${dias} días de atraso`;
}

/** Cuánto falta para una sesión por vencer: 0 es hoy. */
export function textoRestante(dias: number): string {
  if (dias === 0) {
    return 'hoy';
  }
  return dias === 1 ? 'mañana' : `en ${dias} días`;
}

/* Registro de la clase (RF-20, HU-08-04) y de los ausentes (RF-22, HU-09-02). */

/**
 * La sesión con los temas del contenido programático y lo ya registrado. La lista del curso y
 * las observaciones solo llegan a quien puede registrar: el backend decide.
 */
export function consultarSesion(
  idProyecto: number,
  idSesion: number,
  senal?: AbortSignal,
) {
  return obtener<DetalleSesion>(
    `/proyectos-docentes/${idProyecto}/sesiones/${idSesion}`,
    { senal },
  );
}

/** Guarda temas, ausentes y observaciones, y marca la sesión como diligenciada. */
export function registrarSesion(
  idProyecto: number,
  idSesion: number,
  datos: DatosRegistrarSesion,
) {
  return solicitar<DetalleSesion>(
    `/proyectos-docentes/${idProyecto}/sesiones/${idSesion}/registro`,
    { metodo: 'PUT', cuerpo: datos },
  );
}

/** Genera el calendario o, si ya existe, recalcula las sesiones sin diligenciar. */
export function generarCalendario(idProyecto: number) {
  return enviar<ResultadoGeneracion>(
    `/proyectos-docentes/${idProyecto}/calendario`,
  );
}
