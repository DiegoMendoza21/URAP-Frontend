import { enviarFormulario, obtener } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type Matriculado = Esquemas['MatriculadoDto'];
export type PaginaMatriculados = Esquemas['PaginaMatriculadosDto'];
export type ResultadoCargaMatriculados =
  Esquemas['ResultadoCargaMatriculadosDto'];
export type EstadoMatricula = Matriculado['estado'];
export type SesionInasistencia = Esquemas['SesionInasistenciaDto'];
/** Por apellidos o, primero, quienes más inasistencias tienen (HU-09-03). */
export type OrdenMatriculados = 'apellidos' | 'inasistencias';

/*
 * Lista de estudiantes matriculados del curso (RF-22, HU-09-01), con las inasistencias
 * acumuladas de cada uno (HU-09-03). Son datos personales (Ley 1581 de 2012): el backend solo
 * la entrega al Administrador y a los docentes asignados al proyecto, registra cada consulta
 * en la auditoría, y solo el Administrador la carga.
 */

/** Columnas que el backend reconoce en el Excel. Correo es opcional. */
export const COLUMNAS_LISTA = ['Documento', 'Nombres', 'Apellidos', 'Correo'];

export function consultarMatriculados(
  idProyecto: number,
  {
    pagina,
    tamano,
    estado,
    orden,
  }: {
    pagina: number;
    tamano: number;
    estado: EstadoMatricula;
    orden: OrdenMatriculados;
  },
  senal?: AbortSignal,
) {
  const consulta = new URLSearchParams({
    pagina: String(pagina),
    tamano: String(tamano),
    estado,
    orden,
  });
  return obtener<PaginaMatriculados>(
    `/proyectos-docentes/${idProyecto}/matriculados?${consulta}`,
    { senal },
  );
}

export function cargarListaMatriculados(idProyecto: number, archivo: File) {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  return enviarFormulario<ResultadoCargaMatriculados>(
    `/proyectos-docentes/${idProyecto}/matriculados`,
    formulario,
  );
}
