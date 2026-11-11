'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  consultarMedicion,
  etiquetaTipo,
  etiquetaToma,
  type MedicionDetalle,
  nombreRap,
} from '@/api/mediciones';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { Analisis } from './Analisis';
import { Consolidado } from './Consolidado';
import { Instrumentos } from './Instrumentos';
import { Valoracion } from './Valoracion';

/** Prefijo de los textos de rúbrica que todavía no son los oficiales del programa. */
const PREFIJO_PROVISIONAL = 'PROVISIONAL';

/**
 * Medición de RAP (formato FO-DO/PC-023): rúbrica y escala, instrumentos por indicador
 * (HU-11-02), nivel de cada estudiante (HU-11-03), consolidado (HU-11-04, HU-11-05) y análisis
 * con el cierre (HU-11-06, HU-11-07). El backend dice qué puede hacer quien consulta.
 */
export function HojaMedicion() {
  const { id } = useParams<{ id: string }>();
  const idMedicion = /^\d+$/.test(id) ? Number(id) : null;
  const consulta = useConsulta(
    idMedicion === null ? null : `medicion-${idMedicion}`,
    (senal) => consultarMedicion(idMedicion!, senal),
  );
  // Guardar devuelve la medición actualizada. Vale mientras no llegue una consulta nueva: si
  // se vuelve a consultar, manda lo consultado.
  const [actualizada, setActualizada] = useState<{
    base: MedicionDetalle;
    medicion: MedicionDetalle;
  } | null>(null);
  // Cambia con cada guardado de valoraciones o del estado: el consolidado se vuelve a pedir.
  const [version, setVersion] = useState(0);
  const alCambiar = (nueva: MedicionDetalle) => {
    if (consulta.estado === 'lista') {
      setActualizada({ base: consulta.datos, medicion: nueva });
    }
    setVersion((valor) => valor + 1);
  };
  const medicion =
    consulta.estado !== 'lista'
      ? null
      : actualizada?.base === consulta.datos
        ? actualizada.medicion
        : consulta.datos;

  return (
    <section className="space-y-6">
      {idMedicion === null && (
        <AvisoError mensaje="La medición no existe o no tiene acceso a ella." />
      )}
      {consulta.estado === 'cargando' && <Cargando />}
      {consulta.estado === 'fallida' && (
        <AvisoError
          mensaje={consulta.mensaje}
          reintentar={consulta.reintentable ? consulta.reintentar : undefined}
        />
      )}
      {medicion && (
        <>
          <Cabecera medicion={medicion} />
          <Instrumentos medicion={medicion} alGuardar={alCambiar} />
          <Valoracion
            key={medicion.id}
            medicion={medicion}
            alGuardar={() => setVersion((valor) => valor + 1)}
          />
          <Consolidado idMedicion={medicion.id} version={version} />
          <Analisis
            key={`analisis-${medicion.id}`}
            medicion={medicion}
            alCambiar={alCambiar}
          />
        </>
      )}
    </section>
  );
}

function Cabecera({ medicion }: { medicion: MedicionDetalle }) {
  const provisional = medicion.indicadores.some(
    (indicador) =>
      indicador.descripcion?.startsWith(PREFIJO_PROVISIONAL) ||
      indicador.descriptores.some((descriptor) =>
        descriptor.descripcion.startsWith(PREFIJO_PROVISIONAL),
      ),
  );
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Link
          href={`/proyectos-docentes/${medicion.proyecto.id}/mediciones`}
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
        >
          ← Mediciones del curso
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Medición del {nombreRap(medicion.rap)}
        </h1>
        <p className="text-slate-700">
          {medicion.proyecto.asignatura}
          {medicion.proyecto.grupo ? ` · Grupo ${medicion.proyecto.grupo}` : ''}
          {medicion.proyecto.periodo
            ? ` · Período ${medicion.proyecto.periodo}`
            : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Insignia
          tono={medicion.estado === 'cerrada' ? 'neutro' : 'advertencia'}
        >
          {medicion.estado === 'cerrada' ? 'Cerrada' : 'Borrador'}
        </Insignia>
        <Insignia tono="marca">
          Valoración {etiquetaTipo(medicion.tipoValoracion).toLowerCase()}
        </Insignia>
        <Insignia>
          {etiquetaToma(medicion.periodoToma, medicion.anioToma)}
        </Insignia>
        {medicion.versionRubrica !== null && (
          <Insignia>Rúbrica versión {medicion.versionRubrica}</Insignia>
        )}
      </div>
      {medicion.rap.descripcion && (
        <p className="text-sm text-slate-700">{medicion.rap.descripcion}</p>
      )}
      {provisional && (
        <Advertencia titulo="Rúbrica provisional">
          <p>
            Los textos de esta rúbrica no son todavía los oficiales del
            programa.
          </p>
        </Advertencia>
      )}
      {medicion.estado === 'cerrada' && (
        <Advertencia titulo="La medición está cerrada.">
          <p>
            Sus valoraciones ya no se pueden modificar.{' '}
            {medicion.puedeReabrir
              ? 'Si hay que corregirla, puede reabrirla al final de esta página.'
              : 'Solo el departamento académico puede reabrirla.'}
          </p>
        </Advertencia>
      )}
      {medicion.estado === 'borrador' && !medicion.puedeEditar && (
        <p className="text-sm text-slate-600">
          Consulta: solo el docente del curso registra los instrumentos y las
          valoraciones.
        </p>
      )}
    </div>
  );
}
