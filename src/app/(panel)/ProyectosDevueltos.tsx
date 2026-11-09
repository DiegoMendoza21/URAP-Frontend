'use client';

import Link from 'next/link';
import {
  consultarProyectosDocentes,
  type ProyectoDocenteResumen,
} from '@/api/proyectos-docentes';
import { useConsulta } from './proyectos-docentes/_componentes/useConsulta';

/** Estado en que queda el proyecto que el departamento devuelve con observaciones (RF-18). */
const ESTADO_DEVUELTO = 'devuelto';
/** El máximo de proyectos por página que admite el backend. */
const TAMANO_PAGINA = 100;
/** Tope de páginas: un docente tiene pocos proyectos, así que una basta casi siempre. */
const PAGINAS_MAXIMO = 5;

/**
 * Los proyectos devueltos en los que el usuario es docente asignado. La bandeja ya trae solo
 * los proyectos del docente; se filtra también por docente asignado para que un usuario que
 * además ve los del programa (un líder RAP) no reciba avisos de proyectos ajenos.
 */
async function consultarDevueltos(
  idUsuario: number,
  senal: AbortSignal,
): Promise<ProyectoDocenteResumen[]> {
  const devueltos: ProyectoDocenteResumen[] = [];
  for (let pagina = 1; pagina <= PAGINAS_MAXIMO; pagina++) {
    const datos = await consultarProyectosDocentes(
      pagina,
      TAMANO_PAGINA,
      senal,
    );
    devueltos.push(
      ...datos.elementos.filter(
        (proyecto) =>
          proyecto.estado?.codigo === ESTADO_DEVUELTO &&
          proyecto.docentes.some((docente) => docente.id === idUsuario),
      ),
    );
    if (pagina * TAMANO_PAGINA >= datos.total) {
      break;
    }
  }
  return devueltos;
}

function nombreCurso(proyecto: ProyectoDocenteResumen): string {
  const asignatura = proyecto.asignatura ?? 'Proyecto docente';
  return proyecto.grupo
    ? `${asignatura} · grupo ${proyecto.grupo}`
    : asignatura;
}

/**
 * Aviso en el panel del docente de los proyectos que el departamento académico le devolvió con
 * observaciones (RF-18), con un acceso a cada uno para corregir y reenviar (HU-07-05). Si no
 * hay ninguno, o si no se pudo consultar, no se muestra: la bandeja de proyectos sigue
 * mostrando el estado de cada uno.
 */
export function ProyectosDevueltos({ idUsuario }: { idUsuario: number }) {
  const consulta = useConsulta(`proyectos-devueltos-${idUsuario}`, (senal) =>
    consultarDevueltos(idUsuario, senal),
  );
  if (consulta.estado !== 'lista' || consulta.datos.length === 0) {
    return null;
  }
  const devueltos = consulta.datos;
  // Solo el docente responsable envía el proyecto (RF-17). Los demás docentes asignados
  // corrigen, pero no se les pide reenviarlo.
  const esResponsable = (proyecto: ProyectoDocenteResumen) =>
    proyecto.docentes.some(
      (docente) => docente.id === idUsuario && docente.responsable,
    );
  const todosPropios = devueltos.every(esResponsable);

  return (
    <section
      aria-labelledby="titulo-devueltos"
      className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm"
    >
      <div className="space-y-1">
        <h2 id="titulo-devueltos" className="font-semibold text-amber-950">
          {devueltos.length === 1
            ? 'Le devolvieron un proyecto docente'
            : `Le devolvieron ${devueltos.length} proyectos docentes`}
        </h2>
        <p className="text-sm text-amber-950">
          {todosPropios
            ? 'El departamento académico dejó observaciones. Corríjalas, márquelas como resueltas y envíe el proyecto de nuevo a revisión.'
            : 'El departamento académico dejó observaciones. Corríjalas y márquelas como resueltas. El docente responsable de cada proyecto es quien lo envía de nuevo a revisión.'}
        </p>
      </div>
      <ul className="divide-y divide-amber-200">
        {devueltos.map((proyecto) => (
          <li key={proyecto.id}>
            <Link
              href={`/proyectos-docentes/${proyecto.id}/diligenciar`}
              className="flex min-h-11 items-center justify-between gap-3 py-2 text-amber-950 hover:text-marca"
            >
              <span>
                <span className="block font-medium">
                  {nombreCurso(proyecto)}
                </span>
                <span className="block text-sm">
                  {[
                    proyecto.periodo
                      ? `Período ${proyecto.periodo} · ver las observaciones`
                      : 'Ver las observaciones',
                    esResponsable(proyecto)
                      ? null
                      : 'lo envía el docente responsable',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span aria-hidden="true" className="text-marca">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
