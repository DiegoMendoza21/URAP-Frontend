'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { nombreDocente } from '@/api/proyectos-docentes';
import {
  consultarPendientesRevision,
  type FiltroRevision,
  MOTIVO_NO_REVISABLE,
  type PendienteRevision,
} from '@/api/revision';
import {
  consultarFiltrosSeguimiento,
  type FiltrosSeguimiento,
} from '@/api/seguimiento';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../proyectos-docentes/_componentes/Estados';
import { momento } from '../proyectos-docentes/_componentes/fechas';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';

const TAMANO_PAGINA = 20;
const DIA_MS = 24 * 60 * 60 * 1000;

/** «Llegó hoy», «Espera hace 5 días»: desde cuándo espera el proyecto (HU-07-02). */
function espera(fechaEnvio: string): string {
  const dias = Math.floor(
    (Date.now() - new Date(fechaEnvio).getTime()) / DIA_MS,
  );
  if (dias <= 0) {
    return 'Llegó hoy';
  }
  return dias === 1 ? 'Espera hace 1 día' : `Espera hace ${dias} días`;
}

/**
 * Bandeja de proyectos pendientes de revisión (RF-18, p1; HU-07-02). El backend devuelve solo
 * los «Enviado a revisión» de los programas donde el usuario aprueba, los más antiguos primero.
 */
export function BandejaRevision() {
  const [filtro, setFiltro] = useState<FiltroRevision>({});
  const [pagina, setPagina] = useState(1);
  const clave = `revision-${JSON.stringify(filtro)}-${pagina}`;
  const pendientes = useConsulta(clave, (senal) =>
    consultarPendientesRevision(filtro, pagina, TAMANO_PAGINA, senal),
  );
  // Las opciones de los filtros son las del tablero de seguimiento. Si el usuario no lo abre
  // (un rol que aprueba sin consultar el tablero), la bandeja funciona sin filtros.
  const opciones = useConsulta('filtros-revision', consultarFiltrosSeguimiento);
  const totalPaginas =
    pendientes.estado === 'lista'
      ? Math.max(1, Math.ceil(pendientes.datos.total / TAMANO_PAGINA))
      : 1;
  const hayFiltros = Object.values(filtro).some(Boolean);

  return (
    <section aria-labelledby="titulo-revision" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <h1 id="titulo-revision" className="text-2xl font-bold sm:text-3xl">
          Proyectos pendientes de revisión
        </h1>
        <p className="text-slate-700">
          Apruebe cada proyecto docente o devuélvalo con observaciones por
          sección. Los que llevan más tiempo esperando aparecen primero.
        </p>
      </div>

      {opciones.estado === 'lista' && (
        <Filtros
          opciones={opciones.datos}
          filtro={filtro}
          alCambiar={(cambio) => {
            setFiltro((previo) => ({ ...previo, ...cambio }));
            setPagina(1);
          }}
        />
      )}

      {pendientes.estado === 'cargando' && <Cargando />}
      {pendientes.estado === 'fallida' && (
        <AvisoError
          mensaje={pendientes.mensaje}
          reintentar={
            pendientes.reintentable ? pendientes.reintentar : undefined
          }
        />
      )}
      {pendientes.estado === 'lista' && pendientes.datos.total === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-600">
          {hayFiltros
            ? 'No hay proyectos pendientes de revisión con estos filtros.'
            : 'No hay proyectos pendientes de revisión. Cuando un docente envíe el suyo, aparecerá aquí.'}
        </p>
      )}
      {pendientes.estado === 'lista' &&
        pendientes.datos.elementos.length > 0 && (
          <>
            <p className="text-sm text-slate-700">
              {pendientes.datos.total === 1
                ? '1 proyecto pendiente'
                : `${pendientes.datos.total} proyectos pendientes`}
            </p>
            <ul className="space-y-3">
              {pendientes.datos.elementos.map((proyecto) => (
                <li key={proyecto.id}>
                  <TarjetaPendiente proyecto={proyecto} />
                </li>
              ))}
            </ul>
            {totalPaginas > 1 && (
              <nav
                aria-label="Páginas de la bandeja de revisión"
                className="flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => setPagina(pagina - 1)}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
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
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
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

/**
 * Un proyecto de la bandeja. Si el usuario es docente del proyecto, el backend lo marca como no
 * revisable (RF-18, separación de funciones) y la tarjeta muestra el motivo en vez de invitar a
 * revisarlo: debe hacerlo otra persona del Departamento.
 */
function TarjetaPendiente({ proyecto }: { proyecto: PendienteRevision }) {
  const responsable = proyecto.docentes.find((docente) => docente.responsable);
  return (
    <Link
      href={`/proyectos-docentes/${proyecto.id}/revision`}
      className="block space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{proyecto.asignatura}</p>
          <p className="text-sm text-slate-600">
            {[
              proyecto.programa,
              proyecto.periodo,
              proyecto.grupo ? `Grupo ${proyecto.grupo}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {proyecto.fechaEnvio && (
          <Insignia tono="advertencia">{espera(proyecto.fechaEnvio)}</Insignia>
        )}
      </div>
      {responsable && (
        <p className="text-sm text-slate-700">
          Responsable: {nombreDocente(responsable)}
        </p>
      )}
      {!proyecto.puedeRevisar && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          {proyecto.motivo ?? MOTIVO_NO_REVISABLE}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {proyecto.fechaEnvio && (
          <span className="text-slate-600">
            Enviado el {momento(proyecto.fechaEnvio)}
          </span>
        )}
        <span className="font-semibold text-marca">
          {proyecto.puedeRevisar ? 'Revisar →' : 'Ver el proyecto →'}
        </span>
      </div>
    </Link>
  );
}

function Filtros({
  opciones,
  filtro,
  alCambiar,
}: {
  opciones: FiltrosSeguimiento;
  filtro: FiltroRevision;
  alCambiar: (cambio: FiltroRevision) => void;
}) {
  const ids = { programa: useId(), asignatura: useId(), docente: useId() };
  const asignaturas = opciones.asignaturas.filter(
    (asignatura) =>
      !filtro.idPrograma || asignatura.idPrograma === filtro.idPrograma,
  );
  const numero = (valor: string) => (valor ? Number(valor) : undefined);
  const clase =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  return (
    <form
      onSubmit={(evento) => evento.preventDefault()}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-6"
    >
      {opciones.programas.length > 1 && (
        <div className="space-y-1">
          <label htmlFor={ids.programa} className="block font-medium">
            Programa
          </label>
          <select
            id={ids.programa}
            value={filtro.idPrograma ?? ''}
            onChange={(evento) =>
              alCambiar({
                idPrograma: numero(evento.target.value),
                idAsignatura: undefined,
              })
            }
            className={clase}
          >
            <option value="">Todos</option>
            {opciones.programas.map((programa) => (
              <option key={programa.id} value={programa.id}>
                {programa.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor={ids.asignatura} className="block font-medium">
          Asignatura
        </label>
        <select
          id={ids.asignatura}
          value={filtro.idAsignatura ?? ''}
          onChange={(evento) =>
            alCambiar({ idAsignatura: numero(evento.target.value) })
          }
          className={clase}
        >
          <option value="">Todas</option>
          {asignaturas.map((asignatura) => (
            <option key={asignatura.id} value={asignatura.id}>
              {asignatura.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor={ids.docente} className="block font-medium">
          Docente
        </label>
        <select
          id={ids.docente}
          value={filtro.idDocente ?? ''}
          onChange={(evento) =>
            alCambiar({ idDocente: numero(evento.target.value) })
          }
          className={clase}
        >
          <option value="">Todos</option>
          {opciones.docentes.map((docente) => (
            <option key={docente.id} value={docente.id}>
              {docente.nombre}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
