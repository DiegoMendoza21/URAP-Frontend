'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  consultarMediciones,
  type EstadoMedicion,
  etiquetaTipo,
  etiquetaToma,
  nombreRap,
} from '@/api/mediciones';
import { porcentaje } from '@/componentes/formato';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';
import { base, Juicio, META_NO_DEFINIDA } from './[id]/Consolidado';

const TAMANO_PAGINA = 20;

const FILTROS: { valor: EstadoMedicion | null; etiqueta: string }[] = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'borrador', etiqueta: 'En borrador' },
  { valor: 'cerrada', etiqueta: 'Cerradas' },
];

/**
 * Módulo de medición de RAP (RF-30, p1; RF-31, p1): las mediciones que el usuario puede abrir.
 * El docente ve las de sus cursos; el líder RAP, las de los RAP que lidera; el departamento,
 * las de su programa. Las nuevas se inician desde el proyecto docente de cada curso.
 */
export function ListaMediciones() {
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState<EstadoMedicion | null>(null);
  const consulta = useConsulta(`mediciones-${estado}-${pagina}`, (senal) =>
    consultarMediciones(
      { pagina, tamano: TAMANO_PAGINA, estado: estado ?? undefined },
      senal,
    ),
  );
  const totalPaginas =
    consulta.estado === 'lista'
      ? Math.max(1, Math.ceil(consulta.datos.total / TAMANO_PAGINA))
      : 1;

  return (
    <section aria-labelledby="titulo-lista-mediciones" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <h1
          id="titulo-lista-mediciones"
          className="text-2xl font-bold sm:text-3xl"
        >
          Medición de RAP
        </h1>
        <p className="text-slate-700">
          Para iniciar una medición, abra el proyecto docente del curso y elija
          «Medición de RAP».
        </p>
      </div>

      <div
        role="group"
        aria-label="Mostrar"
        className="flex w-full rounded-lg border border-slate-300 text-sm sm:w-auto sm:self-start"
      >
        {FILTROS.map((filtro) => (
          <button
            key={filtro.etiqueta}
            type="button"
            aria-pressed={estado === filtro.valor}
            onClick={() => {
              setEstado(filtro.valor);
              setPagina(1);
            }}
            className={`flex-1 px-3 py-2 font-semibold first:rounded-l-lg last:rounded-r-lg sm:flex-none ${
              estado === filtro.valor
                ? 'bg-marca text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {filtro.etiqueta}
          </button>
        ))}
      </div>

      {consulta.estado === 'cargando' && <Cargando />}
      {consulta.estado === 'fallida' && (
        <AvisoError
          mensaje={consulta.mensaje}
          reintentar={consulta.reintentable ? consulta.reintentar : undefined}
        />
      )}
      {consulta.estado === 'lista' &&
        (consulta.datos.elementos.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            No hay mediciones para mostrar.
          </p>
        ) : (
          <ul className="space-y-3">
            {consulta.datos.elementos.map((medicion) => (
              <li key={medicion.id}>
                <Link
                  href={`/mediciones/${medicion.id}`}
                  className="block space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {nombreRap(medicion.rap)} ·{' '}
                        {medicion.proyecto.asignatura}
                        {medicion.proyecto.grupo
                          ? ` · Grupo ${medicion.proyecto.grupo}`
                          : ''}
                      </p>
                      <p className="text-sm text-slate-600">
                        {etiquetaTipo(medicion.tipoValoracion)} ·{' '}
                        {etiquetaToma(medicion.periodoToma, medicion.anioToma)}
                        {medicion.proyecto.periodo
                          ? ` · Período ${medicion.proyecto.periodo}`
                          : ''}
                      </p>
                    </div>
                    <Insignia
                      tono={
                        medicion.estado === 'cerrada' ? 'neutro' : 'advertencia'
                      }
                    >
                      {medicion.estado === 'cerrada' ? 'Cerrada' : 'Borrador'}
                    </Insignia>
                  </div>
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span>
                      Logro del RAP:{' '}
                      <strong>
                        {porcentaje(medicion.porcentajeCumplimiento)}
                      </strong>
                      {medicion.valoracionesTotales > 0 &&
                        ` (${base(medicion.valoracionesEnCumplimiento, medicion.valoracionesTotales)})`}
                    </span>
                    <span className="text-slate-600">
                      · Esperado:{' '}
                      {medicion.porcentajeEsperado === null
                        ? META_NO_DEFINIDA.toLowerCase()
                        : porcentaje(medicion.porcentajeEsperado)}
                    </span>
                    {medicion.porcentajeEsperado !== null && (
                      <Juicio alcanzado={medicion.alcanzado} metaDefinida />
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ))}

      {totalPaginas > 1 && (
        <nav
          aria-label="Páginas"
          className="flex items-center justify-between gap-2"
        >
          <button
            type="button"
            disabled={pagina <= 1}
            onClick={() => setPagina((valor) => valor - 1)}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-600">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((valor) => valor + 1)}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold disabled:opacity-40"
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  );
}
