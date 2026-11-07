import { enviar, obtener, reemplazar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type MedicionesDelProyecto = Esquemas['MedicionesDelProyectoDto'];
export type MedicionResumen = Esquemas['MedicionResumenDto'];
export type MedicionDetalle = Esquemas['MedicionDetalleDto'];
export type IndicadorMedicion = Esquemas['IndicadorMedicionDto'];
export type EstudianteMedicion = Esquemas['EstudianteMedicionDto'];
export type NivelEscala = Esquemas['NivelEscalaDto'];
export type DatosIniciarMedicion = Esquemas['IniciarMedicionDto'];
export type InstrumentoIndicador = Esquemas['InstrumentoIndicadorDto'];
export type Valoracion = Esquemas['ValoracionDto'];
export type ResultadoValoraciones = Esquemas['ResultadoValoracionesDto'];
export type TipoValoracion = MedicionResumen['tipoValoracion'];
export type PeriodoToma = MedicionResumen['periodoToma'];

/*
 * Medición de RAP (RF-30, formato FO-DO/PC-023). El backend decide quién ve y quién registra:
 * el docente asignado al curso registra; el líder del RAP y el departamento consultan. Las
 * valoraciones son datos personales (Ley 1581 de 2012).
 */

export const TIPOS_VALORACION: { valor: TipoValoracion; etiqueta: string }[] = [
  { valor: 'formativa', etiqueta: 'Formativa' },
  { valor: 'sumativa', etiqueta: 'Sumativa' },
];

export const PERIODOS_TOMA: { valor: PeriodoToma; etiqueta: string }[] = [
  { valor: 'primer', etiqueta: 'Primer período' },
  { valor: 'segundo', etiqueta: 'Segundo período' },
];

export function etiquetaTipo(tipo: TipoValoracion): string {
  return tipo === 'sumativa' ? 'Sumativa' : 'Formativa';
}

/** «Primer período de 2024». */
export function etiquetaToma(periodo: PeriodoToma, anio: number): string {
  return `${periodo === 'primer' ? 'Primer' : 'Segundo'} período de ${anio}`;
}

/** «RAP 2», con el código del catálogo o, si falta, el número. */
export function nombreRap(rap: {
  codigo: string | null;
  numero: number | null;
}): string {
  return rap.codigo ?? (rap.numero === null ? 'RAP' : `RAP ${rap.numero}`);
}

export function consultarMedicionesDelProyecto(
  idProyecto: number,
  senal?: AbortSignal,
) {
  return obtener<MedicionesDelProyecto>(
    `/proyectos-docentes/${idProyecto}/mediciones`,
    { senal },
  );
}

export function iniciarMedicion(
  idProyecto: number,
  datos: DatosIniciarMedicion,
) {
  return enviar<MedicionDetalle>(
    `/proyectos-docentes/${idProyecto}/mediciones`,
    datos,
  );
}

export function consultarMedicion(idMedicion: number, senal?: AbortSignal) {
  return obtener<MedicionDetalle>(`/mediciones/${idMedicion}`, { senal });
}

export function registrarInstrumentos(
  idMedicion: number,
  indicadores: InstrumentoIndicador[],
) {
  return reemplazar<MedicionDetalle>(`/mediciones/${idMedicion}/instrumentos`, {
    indicadores,
  });
}

export function registrarValoraciones(
  idMedicion: number,
  valoraciones: Valoracion[],
) {
  return reemplazar<ResultadoValoraciones>(
    `/mediciones/${idMedicion}/valoraciones`,
    { valoraciones },
  );
}

/* Consolidado, análisis y cierre (RF-31). */

export type Consolidado = Esquemas['ConsolidadoDto'];
export type IndicadorConsolidado = Esquemas['IndicadorConsolidadoDto'];
export type MedicionListada = Esquemas['MedicionListadaDto'];
export type PaginaMediciones = Esquemas['PaginaMedicionesDto'];
export type DatosAnalisis = Esquemas['RegistrarAnalisisDto'];
export type EstadoMedicion = MedicionResumen['estado'];

export function consultarMediciones(
  {
    pagina,
    tamano,
    estado,
  }: { pagina: number; tamano: number; estado?: EstadoMedicion },
  senal?: AbortSignal,
) {
  const consulta = new URLSearchParams({
    pagina: String(pagina),
    tamano: String(tamano),
  });
  if (estado) {
    consulta.set('estado', estado);
  }
  return obtener<PaginaMediciones>(`/mediciones?${consulta}`, { senal });
}

export function consultarConsolidado(idMedicion: number, senal?: AbortSignal) {
  return obtener<Consolidado>(`/mediciones/${idMedicion}/consolidado`, {
    senal,
  });
}

export function registrarAnalisis(idMedicion: number, datos: DatosAnalisis) {
  return reemplazar<MedicionDetalle>(
    `/mediciones/${idMedicion}/analisis`,
    datos,
  );
}

export function cerrarMedicion(idMedicion: number) {
  return enviar<MedicionDetalle>(`/mediciones/${idMedicion}/cerrar`);
}

export function reabrirMedicion(idMedicion: number) {
  return enviar<MedicionDetalle>(`/mediciones/${idMedicion}/reabrir`);
}
