'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  consultarOpcionesEvidencias,
  type OpcionesEvidencias,
} from '@/api/evidencias';
import { consultarProyectoDocente } from '@/api/proyectos-docentes';
import { Advertencia, AvisoError, Cargando } from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { type Borrador, guardarBorrador, leerBorrador } from './borrador';
import { FormularioCarga } from './FormularioCarga';
import { GaleriaEvidencias } from './GaleriaEvidencias';

/**
 * Evidencias fotográficas por RAP (RF-24, HU-10-01). El docente elige el RAP, carga las
 * fotos y ve la galería de ese RAP. Los demás roles autorizados solo ven la galería; el
 * backend decide quién ve qué (matriz de permisos, módulo «Documentos»).
 */
export function EvidenciasProyecto() {
  const { id } = useParams<{ id: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;

  return (
    <section aria-labelledby="titulo-evidencias" className="space-y-6">
      <Link
        href={
          idProyecto === null
            ? '/proyectos-docentes'
            : `/proyectos-docentes/${idProyecto}`
        }
        className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
      >
        ← Proyecto docente
      </Link>
      {idProyecto === null ? (
        <AvisoError mensaje="El proyecto docente no existe o no tiene acceso a él." />
      ) : (
        <Contenido idProyecto={idProyecto} />
      )}
    </section>
  );
}

function Contenido({ idProyecto }: { idProyecto: number }) {
  const proyecto = useConsulta(`proyecto-${idProyecto}`, (senal) =>
    consultarProyectoDocente(idProyecto, senal),
  );
  const opciones = useConsulta(`opciones-${idProyecto}`, (senal) =>
    consultarOpcionesEvidencias(idProyecto, senal),
  );

  return (
    <>
      <div className="space-y-1">
        <h1 id="titulo-evidencias" className="text-2xl font-bold sm:text-3xl">
          Evidencias de los RAP
        </h1>
        {proyecto.estado === 'lista' && (
          <p className="text-slate-700">
            {proyecto.datos.asignatura}
            {proyecto.datos.grupo ? ` · Grupo ${proyecto.datos.grupo}` : ''} ·
            Período {proyecto.datos.periodo}
          </p>
        )}
      </div>

      {opciones.estado === 'cargando' && <Cargando />}
      {opciones.estado === 'fallida' && (
        <AvisoError
          mensaje={opciones.mensaje}
          reintentar={opciones.reintentable ? opciones.reintentar : undefined}
        />
      )}
      {opciones.estado === 'lista' && (
        <Evidencias idProyecto={idProyecto} opciones={opciones.datos} />
      )}
    </>
  );
}

function Evidencias({
  idProyecto,
  opciones,
}: {
  idProyecto: number;
  opciones: OpcionesEvidencias;
}) {
  const [borrador, setBorrador] = useState<Borrador>(() =>
    leerBorrador(idProyecto),
  );
  const [pagina, setPagina] = useState(1);
  /** Cambia con cada carga exitosa, para volver a consultar la galería. */
  const [version, setVersion] = useState(0);
  /** Evidencias cargadas en esta visita, por RAP, para actualizar los conteos sin recargar. */
  const [cargadas, setCargadas] = useState<Record<number, number>>({});

  useEffect(() => {
    guardarBorrador(idProyecto, borrador);
  }, [idProyecto, borrador]);

  const { raps } = opciones;
  const rap =
    raps.find((candidato) => candidato.id === borrador.idRap) ?? raps[0];

  if (!rap) {
    return (
      <Advertencia titulo="Este proyecto docente no tiene RAP asociados.">
        <p>Las evidencias se cargan por RAP: no hay a cuál asociarlas.</p>
      </Advertencia>
    );
  }

  const actualizar = (cambios: Partial<Borrador>) =>
    setBorrador((anterior) => ({ ...anterior, ...cambios }));
  const nombreRap = rap.codigo ?? `RAP ${rap.numero}`;

  return (
    <>
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <label htmlFor="rap-evidencias" className="block font-semibold">
          RAP
        </label>
        <select
          id="rap-evidencias"
          value={rap.id}
          onChange={(evento) => {
            actualizar({ idRap: Number(evento.target.value) });
            setPagina(1);
          }}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          {raps.map((opcion) => {
            const total = opcion.totalEvidencias + (cargadas[opcion.id] ?? 0);
            return (
              <option key={opcion.id} value={opcion.id}>
                {`${opcion.codigo ?? `RAP ${opcion.numero}`} · ${
                  total === 1 ? '1 evidencia' : `${total} evidencias`
                }`}
              </option>
            );
          })}
        </select>
        {rap.descripcion && (
          <p className="text-sm text-slate-700">{rap.descripcion}</p>
        )}
      </div>

      {opciones.puedeCargar ? (
        <FormularioCarga
          idProyecto={idProyecto}
          opciones={opciones}
          idRap={rap.id}
          nombreRap={nombreRap}
          borrador={borrador}
          actualizarBorrador={actualizar}
          alCargar={(cantidad) => {
            setCargadas((anterior) => ({
              ...anterior,
              [rap.id]: (anterior[rap.id] ?? 0) + cantidad,
            }));
            setPagina(1);
            setVersion((anterior) => anterior + 1);
          }}
        />
      ) : (
        opciones.motivoSinCarga && (
          <Advertencia titulo={opciones.motivoSinCarga} />
        )
      )}

      <GaleriaEvidencias
        idProyecto={idProyecto}
        idRap={rap.id}
        nombreRap={nombreRap}
        pagina={pagina}
        alCambiarPagina={setPagina}
        version={version}
      />
    </>
  );
}
