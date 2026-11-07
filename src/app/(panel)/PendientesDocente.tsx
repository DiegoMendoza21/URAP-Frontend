'use client';

import Link from 'next/link';
import {
  consultarPendientes,
  type ProyectoConPendientes,
  textoAtraso,
} from '@/api/sesiones';
import {
  AvisoError,
  Cargando,
} from './proyectos-docentes/_componentes/Estados';
import { useConsulta } from './proyectos-docentes/_componentes/useConsulta';

function nombreCurso(proyecto: ProyectoConPendientes): string {
  return proyecto.grupo
    ? `${proyecto.asignatura} · grupo ${proyecto.grupo}`
    : proyecto.asignatura;
}

/**
 * RF-23, p5: el número de sesiones vencidas y por vencer del docente, en su panel, con un
 * acceso al calendario de cada curso. Cuáles están vencidas y el umbral los decide el backend.
 */
export function PendientesDocente() {
  const pendientes = useConsulta('sesiones-pendientes', (senal) =>
    consultarPendientes(senal),
  );

  return (
    <section
      aria-labelledby="titulo-pendientes"
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 id="titulo-pendientes" className="font-semibold">
        Sesiones por diligenciar
      </h2>
      {pendientes.estado === 'cargando' && <Cargando />}
      {pendientes.estado === 'fallida' && (
        <AvisoError
          mensaje={pendientes.mensaje}
          reintentar={
            pendientes.reintentable ? pendientes.reintentar : undefined
          }
        />
      )}
      {pendientes.estado === 'lista' &&
        (pendientes.datos.total === 0 ? (
          <p className="text-sm text-slate-700">
            Está al día: no tiene sesiones vencidas ni por vencer.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2">
              <li
                className={`rounded-lg px-3 py-2 ${pendientes.datos.vencidas > 0 ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-700'}`}
              >
                <span className="block text-2xl font-bold tabular-nums">
                  {pendientes.datos.vencidas}
                </span>
                <span className="text-sm font-medium">
                  {pendientes.datos.vencidas === 1 ? 'vencida' : 'vencidas'}
                </span>
              </li>
              <li
                className={`rounded-lg px-3 py-2 ${pendientes.datos.porVencer > 0 ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}
              >
                <span className="block text-2xl font-bold tabular-nums">
                  {pendientes.datos.porVencer}
                </span>
                <span className="text-sm font-medium">por vencer</span>
              </li>
            </ul>
            <ul className="divide-y divide-slate-100">
              {pendientes.datos.elementos.map((proyecto) => (
                <li key={proyecto.idProyectoDocente}>
                  <Link
                    href={`/proyectos-docentes/${proyecto.idProyectoDocente}/calendario`}
                    className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-marca"
                  >
                    <span>
                      <span className="block font-medium">
                        {nombreCurso(proyecto)}
                      </span>
                      <span className="block text-sm text-slate-600">
                        {[
                          proyecto.vencidas > 0 &&
                            `${proyecto.vencidas} ${proyecto.vencidas === 1 ? 'vencida' : 'vencidas'}` +
                              (proyecto.mayorAtraso
                                ? `, la más antigua con ${textoAtraso(proyecto.mayorAtraso)}`
                                : ''),
                          proyecto.porVencer > 0 &&
                            `${proyecto.porVencer} por vencer`,
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
            {pendientes.datos.total > pendientes.datos.elementos.length && (
              <Link
                href="/proyectos-docentes"
                className="text-sm font-medium text-marca hover:underline"
              >
                Ver todos sus proyectos
              </Link>
            )}
          </>
        ))}
    </section>
  );
}
