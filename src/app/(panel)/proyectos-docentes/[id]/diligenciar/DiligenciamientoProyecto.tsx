'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type ComponentType, useCallback, useState } from 'react';
import {
  consultarDiligenciamiento,
  type Diligenciamiento,
} from '@/api/diligenciamiento';
import { consultarProyectoDocente } from '@/api/proyectos-docentes';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { SeccionDescripcion } from './SeccionDescripcion';
import { SeccionRac } from './SeccionRac';

interface PropiedadesSeccion {
  idProyecto: number;
  puedeEditar: boolean;
  alGuardar: () => void;
}

/**
 * Pantalla de cada sección, por la clave que le da el backend. Los puntos 4 a 7 (RF-13 a
 * RF-16) se agregan aquí cuando el backend los publique en el resumen.
 */
const PANTALLAS: Record<string, ComponentType<PropiedadesSeccion>> = {
  descripcion: SeccionDescripcion,
  rac: SeccionRac,
};

/**
 * Diligenciamiento del proyecto docente por secciones, con la numeración del formato
 * FO-DO/PC-001. Cada sección se guarda por separado y se puede pasar de una a otra sin
 * completarla (HU-06-08): las secciones quedan montadas, así un borrador no se pierde al
 * cambiar de pestaña.
 */
export function DiligenciamientoProyecto() {
  const { id } = useParams<{ id: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;
  const proyecto = useConsulta(
    idProyecto === null ? null : `proyecto-${idProyecto}`,
    (senal) => consultarProyectoDocente(idProyecto!, senal),
  );
  const consulta = useConsulta(
    idProyecto === null ? null : `diligenciamiento-${idProyecto}`,
    (senal) => consultarDiligenciamiento(idProyecto!, senal),
  );
  const [refrescado, setRefrescado] = useState<Diligenciamiento | null>(null);
  const [activa, setActiva] = useState<string | null>(null);

  // Tras guardar una sección se actualiza el resumen sin volver a mostrar «Cargando…».
  const alGuardar = useCallback(() => {
    if (idProyecto === null) {
      return;
    }
    consultarDiligenciamiento(idProyecto).then(setRefrescado, () => {
      // Si falla, el resumen anterior sigue en pantalla; lo guardado no se pierde.
    });
  }, [idProyecto]);

  const resumen =
    refrescado ?? (consulta.estado === 'lista' ? consulta.datos : null);
  const claveActiva = activa ?? resumen?.secciones[0]?.clave ?? null;

  return (
    <section className="space-y-5">
      <Link
        href={
          idProyecto === null
            ? '/proyectos-docentes'
            : `/proyectos-docentes/${idProyecto}`
        }
        className="text-sm font-medium text-marca hover:underline"
      >
        ← Ficha del proyecto
      </Link>

      {idProyecto === null && (
        <AvisoError mensaje="El proyecto docente no existe o no tiene acceso a él." />
      )}
      {consulta.estado === 'cargando' && <Cargando />}
      {consulta.estado === 'fallida' && (
        <AvisoError
          mensaje={consulta.mensaje}
          reintentar={consulta.reintentable ? consulta.reintentar : undefined}
        />
      )}

      {resumen && idProyecto !== null && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">
              Diligenciamiento del proyecto docente
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {proyecto.estado === 'lista'
                ? proyecto.datos.asignatura
                : 'Proyecto docente'}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {resumen.estado && (
                <Insignia tono="marca">{resumen.estado.nombre}</Insignia>
              )}
              {proyecto.estado === 'lista' && proyecto.datos.periodo && (
                <Insignia>Período {proyecto.datos.periodo}</Insignia>
              )}
            </div>
          </div>

          {resumen.motivoNoEditable && (
            <Advertencia titulo="Solo lectura">
              <p>{resumen.motivoNoEditable}</p>
            </Advertencia>
          )}

          <nav aria-label="Secciones del proyecto docente">
            <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {resumen.secciones.map((seccion) => {
                const actual = seccion.clave === claveActiva;
                return (
                  <li key={seccion.clave} className="shrink-0">
                    <button
                      type="button"
                      aria-current={actual ? 'step' : undefined}
                      onClick={() => setActiva(seccion.clave)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${
                        actual
                          ? 'border-marca bg-marca text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span>
                        {seccion.numero}. {seccion.titulo}
                      </span>
                      <span
                        aria-label={seccion.completa ? 'completa' : 'pendiente'}
                        className={`inline-block size-2.5 rounded-full ${
                          seccion.completa ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {resumen.secciones.map((seccion) => {
            const Pantalla = PANTALLAS[seccion.clave];
            return (
              <section
                key={seccion.clave}
                hidden={seccion.clave !== claveActiva}
                aria-labelledby={`titulo-${seccion.clave}`}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="space-y-1">
                  <h2
                    id={`titulo-${seccion.clave}`}
                    className="text-lg font-semibold"
                  >
                    {seccion.numero}. {seccion.titulo}
                  </h2>
                  {seccion.pendientes.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-amber-900">
                      {seccion.pendientes.map((pendiente) => (
                        <li key={pendiente}>{pendiente}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-emerald-700">
                      Sección completa.
                    </p>
                  )}
                </div>
                {Pantalla ? (
                  <Pantalla
                    idProyecto={idProyecto}
                    puedeEditar={resumen.puedeEditar}
                    alGuardar={alGuardar}
                  />
                ) : (
                  <p className="text-sm text-slate-600">
                    Esta sección todavía no está disponible.
                  </p>
                )}
              </section>
            );
          })}
        </>
      )}
    </section>
  );
}
