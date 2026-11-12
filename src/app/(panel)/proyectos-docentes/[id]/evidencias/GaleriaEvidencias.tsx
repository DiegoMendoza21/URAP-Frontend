'use client';

import { useState } from 'react';
import {
  consultarEvidencias,
  type RapEvidencias,
  urlArchivoEvidencia,
} from '@/api/evidencias';
import { nombreDocente } from '@/api/proyectos-docentes';
import { AvisoError, Cargando } from '../../_componentes/Estados';
import { formatoTamano } from '../../_componentes/formatoEvidencias';
import { Paginacion } from '../../_componentes/Paginacion';
import { TarjetaEvidencia } from '../../_componentes/TarjetaEvidencia';
import { useConsulta } from '../../_componentes/useConsulta';

const TAMANO_PAGINA = 12;

/**
 * Galería del proyecto agrupada por RAP (RF-24, p6; HU-10-02): una sección por cada RAP que el
 * usuario puede ver, con sus evidencias, y los RAP sin evidencias señalados desde el resumen.
 * `totales` lleva los conteos ya sumadas las cargas de esta visita.
 */
export function GaleriaEvidencias({
  idProyecto,
  raps,
  totales,
  version,
}: {
  idProyecto: number;
  raps: readonly RapEvidencias[];
  totales: Readonly<Record<number, number>>;
  version: number;
}) {
  const sinEvidencias = raps.filter((rap) => (totales[rap.id] ?? 0) === 0);

  return (
    <section aria-labelledby="titulo-galeria" className="space-y-4">
      <div className="space-y-2">
        <h2 id="titulo-galeria" className="text-lg font-semibold">
          Galería por RAP
        </h2>
        <ul className="flex flex-wrap gap-2" aria-label="Evidencias por RAP">
          {raps.map((rap) => {
            const total = totales[rap.id] ?? 0;
            return (
              <li key={rap.id}>
                <a
                  href={`#rap-${rap.id}`}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                    total === 0
                      ? 'border-amber-300 bg-amber-50 text-amber-950'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  <span className="font-semibold">{nombreDelRap(rap)}</span>
                  <span>{total === 0 ? 'Sin evidencias' : contar(total)}</span>
                </a>
              </li>
            );
          })}
        </ul>
        {sinEvidencias.length > 0 && (
          <p className="text-sm text-slate-700">
            {sinEvidencias.length === 1
              ? `${nombreDelRap(sinEvidencias[0])} todavía no tiene evidencias en este proyecto.`
              : `${sinEvidencias.length} RAP todavía no tienen evidencias en este proyecto.`}
          </p>
        )}
      </div>

      {raps.map((rap) => (
        <SeccionRap
          key={rap.id}
          idProyecto={idProyecto}
          rap={rap}
          total={totales[rap.id] ?? 0}
          version={version}
        />
      ))}
    </section>
  );
}

function SeccionRap({
  idProyecto,
  rap,
  total,
  version,
}: {
  idProyecto: number;
  rap: RapEvidencias;
  total: number;
  version: number;
}) {
  const nombre = nombreDelRap(rap);
  return (
    <section
      id={`rap-${rap.id}`}
      aria-labelledby={`titulo-rap-${rap.id}`}
      className="scroll-mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h3 id={`titulo-rap-${rap.id}`} className="font-semibold">
          {nombre}
          <span className="font-normal text-slate-600"> · {contar(total)}</span>
        </h3>
        {rap.descripcion && (
          <p className="text-sm text-slate-700">{rap.descripcion}</p>
        )}
      </div>
      {total === 0 ? (
        // Sin evidencias no se consulta la galería: el conteo ya lo dice.
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-center text-sm text-amber-950">
          {nombre} todavía no tiene evidencias en este proyecto.
        </p>
      ) : (
        <EvidenciasDelRap
          idProyecto={idProyecto}
          idRap={rap.id}
          nombre={nombre}
          version={version}
        />
      )}
    </section>
  );
}

function EvidenciasDelRap({
  idProyecto,
  idRap,
  nombre,
  version,
}: {
  idProyecto: number;
  idRap: number;
  nombre: string;
  version: number;
}) {
  const [pagina, setPagina] = useState(1);
  const [versionVista, setVersionVista] = useState(version);
  // Con una carga nueva, la galería vuelve a la primera página, donde aparece.
  if (versionVista !== version) {
    setVersionVista(version);
    setPagina(1);
  }
  const galeria = useConsulta(
    `galeria-${idProyecto}-${idRap}-${pagina}-${version}`,
    (senal) =>
      consultarEvidencias(idProyecto, idRap, pagina, TAMANO_PAGINA, senal),
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
        {galeria.datos.elementos.map((evidencia) => (
          <TarjetaEvidencia
            key={evidencia.id}
            url={urlArchivoEvidencia(idProyecto, evidencia.id)}
            evidencia={evidencia}
            detalles={
              <>
                {evidencia.sesion?.semana ? (
                  <p className="text-slate-700">
                    Semana {evidencia.sesion.semana}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500">
                  {evidencia.subidoPor
                    ? `${nombreDocente(evidencia.subidoPor)} · `
                    : ''}
                  {formatoTamano(evidencia.tamanoBytes)}
                </p>
              </>
            }
          />
        ))}
      </ul>
      <Paginacion
        etiqueta={`Páginas de la galería de ${nombre}`}
        pagina={pagina}
        total={galeria.datos.total}
        tamano={TAMANO_PAGINA}
        alCambiar={setPagina}
      />
    </>
  );
}

export function nombreDelRap(rap: {
  codigo: string | null;
  numero: number | null;
}): string {
  return rap.codigo ?? `RAP ${rap.numero ?? ''}`.trim();
}

function contar(total: number): string {
  return total === 1 ? '1 evidencia' : `${total} evidencias`;
}
