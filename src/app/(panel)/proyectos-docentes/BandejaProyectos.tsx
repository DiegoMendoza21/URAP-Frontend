'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  consultarProyectosDocentes,
  nombreDocente,
  type ProyectoDocenteResumen,
} from '@/api/proyectos-docentes';
import { useSesion } from '@/sesion/ProveedorSesion';
import { AvisoError, Cargando, Insignia } from './_componentes/Estados';
import { useConsulta } from './_componentes/useConsulta';

const TAMANO_PAGINA = 20;
/** Rol que crea proyectos docentes (RF-08). Mostrar el botón es presentación: decide el backend. */
const ROL_DEPARTAMENTO = 'Departamento académico';

/**
 * Bandeja de proyectos docentes. El backend devuelve solo los que el usuario puede ver: el
 * docente, aquellos en los que está asignado (HU-05-03); el departamento, los de su programa.
 */
export function BandejaProyectos() {
  const { sesion } = useSesion();
  const [pagina, setPagina] = useState(1);
  const proyectos = useConsulta(`pagina-${pagina}`, (senal) =>
    consultarProyectosDocentes(pagina, TAMANO_PAGINA, senal),
  );
  const puedeCrear =
    sesion.estado === 'autenticado' &&
    sesion.usuario.roles.includes(ROL_DEPARTAMENTO);
  const totalPaginas =
    proyectos.estado === 'lista'
      ? Math.max(1, Math.ceil(proyectos.datos.total / TAMANO_PAGINA))
      : 1;

  return (
    <section aria-labelledby="titulo-bandeja" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/"
            className="text-sm font-medium text-marca hover:underline"
          >
            ← Inicio
          </Link>
          <h1 id="titulo-bandeja" className="text-2xl font-bold sm:text-3xl">
            Proyectos docentes
          </h1>
        </div>
        {puedeCrear && (
          <Link
            href="/proyectos-docentes/nuevo"
            className="rounded-lg bg-marca px-4 py-3 text-center font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
          >
            Nuevo proyecto docente
          </Link>
        )}
      </div>

      {proyectos.estado === 'cargando' && <Cargando />}
      {proyectos.estado === 'fallida' && (
        <AvisoError
          mensaje={proyectos.mensaje}
          reintentar={proyectos.reintentable ? proyectos.reintentar : undefined}
        />
      )}
      {proyectos.estado === 'lista' && proyectos.datos.total === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-600">
          {puedeCrear
            ? 'Todavía no hay proyectos docentes en su programa. Cree el primero con «Nuevo proyecto docente».'
            : 'No tiene proyectos docentes asignados en este momento.'}
        </p>
      )}
      {proyectos.estado === 'lista' && proyectos.datos.elementos.length > 0 && (
        <>
          <ul className="space-y-3">
            {proyectos.datos.elementos.map((proyecto) => (
              <li key={proyecto.id}>
                <TarjetaProyecto proyecto={proyecto} />
              </li>
            ))}
          </ul>
          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas de la bandeja"
              className="flex items-center justify-between gap-3"
            >
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina(pagina - 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-700">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina(pagina + 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function TarjetaProyecto({ proyecto }: { proyecto: ProyectoDocenteResumen }) {
  const responsable = proyecto.docentes.find((docente) => docente.responsable);
  const otros = proyecto.docentes.filter((docente) => !docente.responsable);

  return (
    <Link
      href={`/proyectos-docentes/${proyecto.id}`}
      className="block space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{proyecto.asignatura}</p>
          <p className="text-sm text-slate-600">
            {[
              proyecto.codigoAsignatura,
              proyecto.periodo,
              proyecto.grupo ? `Grupo ${proyecto.grupo}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {proyecto.estado && (
            <Insignia tono="marca">{proyecto.estado.nombre}</Insignia>
          )}
          {proyecto.informacionIncompleta && (
            <Insignia tono="advertencia">Información incompleta</Insignia>
          )}
        </div>
      </div>
      {responsable && (
        <p className="text-sm text-slate-700">
          Responsable: {nombreDocente(responsable)}
          {otros.length > 0 && ` · con ${otros.map(nombreDocente).join(', ')}`}
        </p>
      )}
    </Link>
  );
}
