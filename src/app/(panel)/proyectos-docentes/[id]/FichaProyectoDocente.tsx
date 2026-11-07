'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  consultarProyectoDocente,
  nombreDocente,
} from '@/api/proyectos-docentes';
import { AvisoError, Cargando, Insignia } from '../_componentes/Estados';
import { InformacionGeneral } from '../_componentes/InformacionGeneral';
import { useConsulta } from '../_componentes/useConsulta';

/**
 * Ficha del proyecto docente: la información base con la que lo creó el asistente (RF-08). Las
 * secciones que diligencia el docente (puntos 2 a 7 del formato) están en `diligenciar/`.
 */
export function FichaProyectoDocente() {
  const { id } = useParams<{ id: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;
  const proyecto = useConsulta(
    idProyecto === null ? null : `proyecto-${idProyecto}`,
    (senal) => consultarProyectoDocente(idProyecto!, senal),
  );

  return (
    <section className="space-y-6">
      <Link
        href="/proyectos-docentes"
        className="text-sm font-medium text-marca hover:underline"
      >
        ← Proyectos docentes
      </Link>

      {idProyecto === null && (
        <AvisoError mensaje="El proyecto docente no existe o no tiene acceso a él." />
      )}
      {proyecto.estado === 'cargando' && <Cargando />}
      {proyecto.estado === 'fallida' && (
        <AvisoError
          mensaje={proyecto.mensaje}
          reintentar={proyecto.reintentable ? proyecto.reintentar : undefined}
        />
      )}
      {proyecto.estado === 'lista' && (
        <>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {proyecto.datos.asignatura}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {proyecto.datos.estado && (
                <Insignia tono="marca">{proyecto.datos.estado.nombre}</Insignia>
              )}
              {proyecto.datos.informacionIncompleta && (
                <Insignia tono="advertencia">Información incompleta</Insignia>
              )}
              <Insignia>Período {proyecto.datos.periodo}</Insignia>
            </div>
            <Link
              href={`/proyectos-docentes/${proyecto.datos.id}/diligenciar`}
              className="inline-block w-full rounded-lg bg-marca px-4 py-3 text-center font-semibold text-white hover:bg-marca-oscuro sm:w-auto sm:py-2"
            >
              Secciones del formato (puntos 2 y 3)
            </Link>
          </div>

          <section
            aria-labelledby="titulo-informacion"
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 id="titulo-informacion" className="text-lg font-semibold">
              1. Información general
            </h2>
            <InformacionGeneral
              informacion={proyecto.datos.informacion}
              periodo={proyecto.datos.periodo}
              grupo={proyecto.datos.grupo}
            />
          </section>

          <section
            aria-labelledby="titulo-docentes"
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 id="titulo-docentes" className="text-lg font-semibold">
              Docentes
            </h2>
            <ul className="space-y-2">
              {proyecto.datos.docentes.map((docente) => (
                <li
                  key={docente.id}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="font-medium">{nombreDocente(docente)}</span>
                  {docente.responsable && (
                    <Insignia tono="marca">Responsable · elaboró</Insignia>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="titulo-raps"
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 id="titulo-raps" className="text-lg font-semibold">
              RAP a los que contribuye el curso
            </h2>
            <ul className="space-y-3">
              {proyecto.datos.raps.map((rap) => (
                <li key={rap.id}>
                  <p className="font-semibold">
                    {rap.codigo ?? `RAP ${rap.numero}`}
                  </p>
                  {rap.descripcion && (
                    <p className="text-sm text-slate-700">{rap.descripcion}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  );
}
