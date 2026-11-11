'use client';

import { useState } from 'react';
import {
  consultarConsolidado,
  type Consolidado as DatosConsolidado,
  type IndicadorConsolidado,
} from '@/api/mediciones';
import { porcentaje } from '@/componentes/formato';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';

/** Texto que pide el programa cuando no hay porcentaje esperado (datos institucionales). */
export const META_NO_DEFINIDA = 'Meta no definida por el programa';

/**
 * Sin porcentaje esperado, se dice una sola vez arriba del resultado. Repetido en cada indicador
 * llenaba la pantalla del teléfono con la misma insignia. Es para el reporte de logro; en el
 * consolidado de una medición ya lo dice la advertencia que manda el backend.
 */
export function AvisoSinMeta() {
  return (
    <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
      <strong className="font-semibold text-slate-900">
        {META_NO_DEFINIDA}.
      </strong>{' '}
      Los resultados se presentan sin juicio de cumplimiento.
    </p>
  );
}

/**
 * Consolidado de la medición (RF-31, HU-11-04 y HU-11-05; hoja «Evaluación» del formato
 * FO-DO/PC-023). Lo calcula el backend desde las valoraciones; `version` cambia cada vez que se
 * guardan valoraciones, para volver a pedirlo.
 */
export function Consolidado({
  idMedicion,
  version,
}: {
  idMedicion: number;
  version: number;
}) {
  const consulta = useConsulta(
    `consolidado-${idMedicion}-${version}`,
    (senal) => consultarConsolidado(idMedicion, senal),
  );

  // Al recalcular se sigue mostrando el resultado anterior, sin parpadeo de «Calculando…».
  const [anterior, setAnterior] = useState<DatosConsolidado | null>(null);
  if (consulta.estado === 'lista' && consulta.datos !== anterior) {
    setAnterior(consulta.datos);
  }
  const datos = consulta.estado === 'lista' ? consulta.datos : anterior;

  return (
    <section
      aria-labelledby="titulo-consolidado"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 id="titulo-consolidado" className="text-lg font-semibold">
          Consolidado
        </h2>
        <p className="text-sm text-slate-600">
          Se calcula solo con las valoraciones registradas: si corrige una, el
          resultado se actualiza.
        </p>
      </div>
      {consulta.estado === 'cargando' && !datos && (
        <Cargando texto="Calculando…" />
      )}
      {consulta.estado === 'fallida' && (
        <AvisoError
          mensaje={consulta.mensaje}
          reintentar={consulta.reintentable ? consulta.reintentar : undefined}
        />
      )}
      {datos && consulta.estado !== 'fallida' && <Resultado datos={datos} />}
    </section>
  );
}

/** Cómo se calcula el logro del RAP: se dice siempre junto al número. */
export const COMO_SE_CALCULA =
  'Proporción sobre todas las valoraciones (estudiante × indicador). Regla provisional, pendiente de confirmar con el programa.';

/** «87 de 136 valoraciones»: la base va siempre junto al porcentaje. */
export function base(enCumplimiento: number, total: number): string {
  return `${enCumplimiento} de ${total} ${total === 1 ? 'valoración' : 'valoraciones'}`;
}

function Resultado({ datos }: { datos: DatosConsolidado }) {
  const niveles = datos.indicadores[0]?.conteos ?? [];
  const cumplimiento = datos.nivelesCumplimiento.join(' o ');
  return (
    <div className="space-y-4">
      {/* Sin meta, el backend lo avisa aquí, una sola vez: los indicadores no lo repiten. */}
      {datos.advertencias.length > 0 && (
        <ul
          role="status"
          className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950"
        >
          {datos.advertencias.map((advertencia) => (
            <li key={advertencia}>{advertencia}</li>
          ))}
        </ul>
      )}

      {/* Primero, el juicio de cada indicador. Teléfono: una tarjeta por indicador. */}
      <h3 className="font-semibold">Por indicador</h3>
      <ul className="space-y-3 sm:hidden">
        {datos.indicadores.map((indicador) => (
          <li
            key={indicador.idIndicador}
            className={`space-y-2 rounded-xl border p-3 ${
              indicador.alcanzado === false
                ? 'border-amber-400 bg-amber-50/40'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">Indicador {indicador.numero}</p>
              <p className="text-lg font-bold">
                {porcentaje(indicador.porcentajeCumplimiento)}
              </p>
            </div>
            <Barra indicador={indicador} />
            <p className="text-sm text-slate-700">
              {indicador.enCumplimiento} de {indicador.muestra} estudiantes en{' '}
              {cumplimiento}
              {indicador.sinValorar > 0 &&
                ` · ${indicador.sinValorar} sin valorar`}
            </p>
            <Juicio
              alcanzado={indicador.alcanzado}
              metaDefinida={datos.metaDefinida}
            />
            {indicador.instrumento && (
              <p className="text-sm text-slate-700">
                Instrumento: {indicador.instrumento}
              </p>
            )}
            <dl className="space-y-1 text-sm">
              {indicador.conteos.map((conteo) => (
                <div key={conteo.valor} className="flex justify-between gap-2">
                  <dt className="text-slate-600">
                    {conteo.valor} · {conteo.etiqueta}
                  </dt>
                  <dd className="font-medium whitespace-nowrap">
                    {conteo.cantidad} · {porcentaje(conteo.porcentaje)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* Pantalla ancha: tabla resumen y porcentual, como la hoja del formato. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full text-sm">
          <caption className="sr-only">
            Estudiantes y porcentaje por nivel en cada indicador, con su juicio
          </caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Indicador
              </th>
              {niveles.map((nivel) => (
                <th
                  key={nivel.valor}
                  scope="col"
                  className="px-2 py-2 text-right font-semibold"
                >
                  {nivel.valor} · {nivel.etiqueta}
                </th>
              ))}
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                Muestra
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Cumplimiento
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datos.indicadores.map((indicador) => (
              <tr
                key={indicador.idIndicador}
                className={
                  indicador.alcanzado === false ? 'bg-amber-50/60' : undefined
                }
              >
                <th scope="row" className="px-3 py-2 text-left align-top">
                  <span className="block font-semibold">
                    Indicador {indicador.numero}
                  </span>
                  {indicador.instrumento && (
                    <span className="block text-xs font-normal text-slate-600">
                      {indicador.instrumento}
                    </span>
                  )}
                </th>
                {indicador.conteos.map((conteo) => (
                  <td
                    key={conteo.valor}
                    className="px-2 py-2 text-right align-top whitespace-nowrap"
                  >
                    <span className="block font-medium">{conteo.cantidad}</span>
                    <span className="block text-xs text-slate-600">
                      {porcentaje(conteo.porcentaje)}
                    </span>
                  </td>
                ))}
                <td className="px-2 py-2 text-right align-top">
                  {indicador.muestra}
                  {indicador.sinValorar > 0 && (
                    <span className="block text-xs text-amber-800">
                      {indicador.sinValorar} sin valorar
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <span className="block font-bold whitespace-nowrap">
                    {porcentaje(indicador.porcentajeCumplimiento)}
                  </span>
                  <span className="block text-xs whitespace-nowrap text-slate-600">
                    {indicador.enCumplimiento} de {indicador.muestra}
                  </span>
                  <Juicio
                    alcanzado={indicador.alcanzado}
                    metaDefinida={datos.metaDefinida}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Después, el logro del RAP en la medición, con su base y cómo se calcula. */}
      <h3 className="font-semibold">Logro del RAP en la medición</h3>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-sm text-slate-600">
            Logro en {cumplimiento || 'los niveles de cumplimiento'}
          </dt>
          <dd className="text-2xl font-bold">
            {porcentaje(datos.porcentajeCumplimiento)}
          </dd>
          <dd className="text-sm font-medium">
            {base(datos.valoracionesEnCumplimiento, datos.valoracionesTotales)}
          </dd>
          <dd className="mt-1 text-xs text-slate-600">{COMO_SE_CALCULA}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-sm text-slate-600">Porcentaje esperado</dt>
          <dd className="text-lg font-bold">
            {datos.metaDefinida
              ? porcentaje(datos.porcentajeEsperado)
              : 'Sin definir'}
          </dd>
          {datos.metaDefinida && (
            <dd className="mt-1">
              <Juicio alcanzado={datos.alcanzado} metaDefinida />
            </dd>
          )}
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-sm text-slate-600">Muestra y cohorte</dt>
          <dd className="text-lg font-bold">
            {datos.tamanoMuestra}{' '}
            {datos.tamanoMuestra === 1 ? 'estudiante' : 'estudiantes'}
          </dd>
          <dd className="text-xs text-slate-600">
            {datos.cohorteRegistrada
              ? `Cohorte: ${datos.tamanoCohorte}`
              : `Cohorte no registrada: se usa la muestra (${datos.tamanoMuestra})`}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Barra del porcentaje de cumplimiento; el número ya está escrito al lado. */
function Barra({ indicador }: { indicador: IndicadorConsolidado }) {
  return (
    <div aria-hidden="true" className="h-2 rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full bg-marca"
        style={{ width: `${indicador.porcentajeCumplimiento ?? 0}%` }}
      />
    </div>
  );
}

/**
 * Juicio frente a la meta. Sin porcentaje esperado no dice nada: la pantalla lo avisa una sola
 * vez arriba (`AvisoSinMeta` en el reporte, la advertencia del backend en el consolidado). `avisarSinMeta` es para un resultado sin meta entre otros que sí
 * la tienen, donde ese aviso general no aparece. Sin valoraciones tampoco dice nada.
 */
export function Juicio({
  alcanzado,
  metaDefinida,
  avisarSinMeta = false,
}: {
  alcanzado: boolean | null;
  metaDefinida: boolean;
  avisarSinMeta?: boolean;
}) {
  if (!metaDefinida) {
    return avisarSinMeta ? <Insignia>{META_NO_DEFINIDA}</Insignia> : null;
  }
  if (alcanzado === null) {
    return null;
  }
  return alcanzado ? (
    <Insignia tono="marca">Alcanzado</Insignia>
  ) : (
    <Insignia tono="advertencia">Por debajo de la meta</Insignia>
  );
}
