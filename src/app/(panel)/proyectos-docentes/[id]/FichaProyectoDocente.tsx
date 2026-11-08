'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  consultarProyectoDocente,
  nombreDocente,
} from '@/api/proyectos-docentes';
import { usePermisos } from '@/sesion/permisos';
import { useSesion } from '@/sesion/ProveedorSesion';
import { AvisoError, Cargando, Insignia } from '../_componentes/Estados';
import { InformacionGeneral } from '../_componentes/InformacionGeneral';
import { useConsulta } from '../_componentes/useConsulta';
import { HistorialRevisiones } from './HistorialRevisiones';

/**
 * Roles que ven la lista de estudiantes del curso (RF-22). Es presentación: el backend solo la
 * entrega al Administrador y a los docentes asignados al proyecto.
 */
const ROL_ADMINISTRADOR = 'Administrador';
const ROL_DOCENTE = 'Docente responsable';
/**
 * Roles que consultan la medición de RAP del curso (RF-30). Es presentación: el backend
 * filtra por alcance (el líder, solo los RAP que lidera; el departamento, su programa).
 */
const ROLES_MEDICION = ['Líder RAP', 'Departamento académico'];

/**
 * Ficha del proyecto docente: la información base con la que lo creó el asistente (RF-08). Las
 * secciones que diligencia el docente (puntos 2 a 7 del formato) están en `diligenciar/`.
 */
export function FichaProyectoDocente() {
  const { sesion } = useSesion();
  const tiene = usePermisos();
  const { id } = useParams<{ id: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;
  const proyecto = useConsulta(
    idProyecto === null ? null : `proyecto-${idProyecto}`,
    (senal) => consultarProyectoDocente(idProyecto!, senal),
  );
  // El Administrador la ve siempre; el docente, solo si dicta el curso (como en el backend).
  const veEstudiantes =
    sesion.estado === 'autenticado' &&
    proyecto.estado === 'lista' &&
    (sesion.usuario.roles.includes(ROL_ADMINISTRADOR) ||
      (sesion.usuario.roles.includes(ROL_DOCENTE) &&
        proyecto.datos.docentes.some(
          (docente) => docente.id === sesion.usuario.id,
        )));
  const veMediciones =
    sesion.estado === 'autenticado' &&
    proyecto.estado === 'lista' &&
    ((sesion.usuario.roles.includes(ROL_DOCENTE) &&
      proyecto.datos.docentes.some(
        (docente) => docente.id === sesion.usuario.id,
      )) ||
      sesion.usuario.roles.some((rol) => ROLES_MEDICION.includes(rol)));

  // HU-07-02: quien aprueba entra a revisar un proyecto enviado. El backend comprueba además
  // que apruebe en el programa del proyecto.
  const puedeRevisar =
    proyecto.estado === 'lista' &&
    proyecto.datos.estado?.codigo === 'enviado' &&
    tiene('proyectos.aprobar');

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
              Diligenciar el proyecto
            </Link>
            {puedeRevisar && (
              <Link
                href={`/proyectos-docentes/${proyecto.datos.id}/revision`}
                className="inline-block w-full rounded-lg border border-marca px-4 py-3 text-center font-semibold text-marca hover:bg-marca/5 sm:ml-2 sm:w-auto sm:py-2"
              >
                Revisar el proyecto
              </Link>
            )}
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

          <Link
            href={`/proyectos-docentes/${idProyecto}/calendario`}
            className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca sm:p-6"
          >
            <span>
              <span className="block text-lg font-semibold">
                Calendario de sesiones
              </span>
              <span className="block text-sm text-slate-600">
                Días y horas de clase, y las sesiones del período con sus
                festivos.
              </span>
            </span>
            <span aria-hidden="true" className="text-xl text-marca">
              →
            </span>
          </Link>

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

          {veEstudiantes && (
            <Link
              href={`/proyectos-docentes/${idProyecto}/matriculados`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-semibold shadow-sm hover:border-marca hover:text-marca sm:p-6"
            >
              <span>Estudiantes matriculados</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}

          {veMediciones && (
            <Link
              href={`/proyectos-docentes/${idProyecto}/mediciones`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-semibold shadow-sm hover:border-marca hover:text-marca sm:p-6"
            >
              <span>Medición de RAP</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}

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

          <HistorialRevisiones idProyecto={proyecto.datos.id} />

          {/* RF-24: el backend decide quién carga y quién ve cada evidencia. */}
          <Link
            href={`/proyectos-docentes/${idProyecto}/evidencias`}
            className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca sm:p-6"
          >
            <span>
              <span className="block text-lg font-semibold">
                Evidencias de los RAP
              </span>
              <span className="block text-sm text-slate-600">
                Fotos y documentos que respaldan el desarrollo de cada RAP en el
                curso.
              </span>
            </span>
            <span aria-hidden="true" className="text-xl text-marca">
              →
            </span>
          </Link>
        </>
      )}
    </section>
  );
}
