'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  consultarEvidenciasRapACargo,
  consultarRapsACargo,
  type RapACargo,
  urlArchivoEvidencia,
} from '@/api/evidencias';
import { nombreDocente } from '@/api/proyectos-docentes';
import {
  Advertencia,
  AvisoError,
  Cargando,
} from '../proyectos-docentes/_componentes/Estados';
import { Paginacion } from '../proyectos-docentes/_componentes/Paginacion';
import { TarjetaEvidencia } from '../proyectos-docentes/_componentes/TarjetaEvidencia';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';

const TAMANO_PAGINA = 12;

/**
 * HU-10-04 (RF-24): el Líder RAP consulta las evidencias de los RAP a su cargo, en todas las
 * asignaturas del programa. Cuáles son sus RAP lo decide el backend (`lider_rap`); los archivos
 * se descargan por /api con la sesión y cada consulta queda en la auditoría.
 */
export function EvidenciasRapACargo() {
  const raps = useConsulta('raps-a-cargo', (senal) =>
    consultarRapsACargo(senal),
  );

  return (
    <section aria-labelledby="titulo-evidencias-rap" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <h1
          id="titulo-evidencias-rap"
          className="text-2xl font-bold sm:text-3xl"
        >
          Evidencias de mis RAP
        </h1>
        <p className="text-slate-700">
          Las evidencias que cargan los docentes en todas las asignaturas que
          tributan a los RAP a su cargo.
        </p>
      </div>

      {(raps.estado === 'cargando' || raps.estado === 'inactiva') && (
        <Cargando />
      )}
      {raps.estado === 'fallida' && (
        <AvisoError
          mensaje={raps.mensaje}
          reintentar={raps.reintentable ? raps.reintentar : undefined}
        />
      )}
      {raps.estado === 'lista' && raps.datos.raps.length === 0 && (
        <Advertencia titulo="No tiene RAP a su cargo.">
          <p>
            El Administrador asigna los líderes de cada RAP por período. Cuando
            le asigne uno, aquí verá sus evidencias.
          </p>
        </Advertencia>
      )}
      {raps.estado === 'lista' && raps.datos.raps.length > 0 && (
        <>
          <ul className="flex flex-wrap gap-2" aria-label="Sus RAP">
            {raps.datos.raps.map((rap) => (
              <li key={rap.id}>
                <a
                  href={`#rap-${rap.id}`}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                    rap.totalEvidencias === 0
                      ? 'border-amber-300 bg-amber-50 text-amber-950'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  <span className="font-semibold">{nombreDelRap(rap)}</span>
                  <span>
                    {rap.totalEvidencias === 0
                      ? 'Sin evidencias'
                      : contar(rap.totalEvidencias)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {raps.datos.raps.map((rap) => (
            <SeccionRap key={rap.id} rap={rap} />
          ))}
        </>
      )}
    </section>
  );
}

function SeccionRap({ rap }: { rap: RapACargo }) {
  const nombre = nombreDelRap(rap);
  return (
    <section
      id={`rap-${rap.id}`}
      aria-labelledby={`titulo-rap-${rap.id}`}
      className="scroll-mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 id={`titulo-rap-${rap.id}`} className="text-lg font-semibold">
          {nombre}
          <span className="font-normal text-slate-600">
            {' '}
            · {contar(rap.totalEvidencias)}
          </span>
        </h2>
        {rap.descripcion && (
          <p className="text-sm text-slate-700">{rap.descripcion}</p>
        )}
        <p className="text-sm text-slate-600">
          {periodos(rap)} ·{' '}
          {rap.totalProyectos === 1
            ? `${rap.proyectosConEvidencias} de 1 proyecto docente con evidencias`
            : `${rap.proyectosConEvidencias} de ${rap.totalProyectos} proyectos docentes con evidencias`}
        </p>
      </div>
      {rap.totalEvidencias === 0 ? (
        // Sin evidencias no se consulta la galería: no hay nada que mostrar ni que auditar.
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-center text-sm text-amber-950">
          {nombre} todavía no tiene evidencias en las asignaturas que tributan a
          él.
        </p>
      ) : (
        <EvidenciasDelRap idRap={rap.id} nombre={nombre} />
      )}
    </section>
  );
}

function EvidenciasDelRap({
  idRap,
  nombre,
}: {
  idRap: number;
  nombre: string;
}) {
  const [pagina, setPagina] = useState(1);
  const galeria = useConsulta(`evidencias-rap-${idRap}-${pagina}`, (senal) =>
    consultarEvidenciasRapACargo(idRap, pagina, TAMANO_PAGINA, senal),
  );

  if (galeria.estado === 'cargando' || galeria.estado === 'inactiva') {
    return <Cargando />;
  }
  if (galeria.estado === 'fallida') {
    return (
      <AvisoError
        mensaje={galeria.mensaje}
        reintentar={galeria.reintentable ? galeria.reintentar : undefined}
      />
    );
  }
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {galeria.datos.elementos.map((evidencia) => {
          const { proyecto } = evidencia;
          return (
            <TarjetaEvidencia
              key={evidencia.id}
              url={urlArchivoEvidencia(proyecto.id, evidencia.id)}
              evidencia={evidencia}
              detalles={
                <>
                  <p className="font-medium text-slate-800">
                    {proyecto.asignatura ?? 'Asignatura sin nombre'}
                    {proyecto.grupo ? ` · Grupo ${proyecto.grupo}` : ''}
                  </p>
                  {proyecto.docenteResponsable && (
                    <p className="text-xs text-slate-600">
                      {nombreDocente(proyecto.docenteResponsable)}
                    </p>
                  )}
                  {proyecto.periodo && (
                    <p className="text-xs text-slate-500">
                      Período {proyecto.periodo}
                    </p>
                  )}
                </>
              }
            />
          );
        })}
      </ul>
      <Paginacion
        etiqueta={`Páginas de las evidencias de ${nombre}`}
        pagina={pagina}
        total={galeria.datos.total}
        tamano={TAMANO_PAGINA}
        alCambiar={setPagina}
      />
    </>
  );
}

function nombreDelRap(rap: RapACargo): string {
  return rap.codigo ?? `RAP ${rap.numero ?? ''}`.trim();
}

function contar(total: number): string {
  return total === 1 ? '1 evidencia' : `${total} evidencias`;
}

function periodos(rap: RapACargo): string {
  if (rap.todosLosPeriodos || rap.periodos.length === 0) {
    return 'Todos los períodos';
  }
  const codigos = rap.periodos.map((periodo) => periodo.codigo ?? '');
  return codigos.length === 1
    ? `Período ${codigos[0]}`
    : `Períodos ${codigos.join(', ')}`;
}
