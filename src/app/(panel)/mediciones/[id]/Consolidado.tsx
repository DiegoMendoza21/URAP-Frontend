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

function Resultado({ datos }: { datos: DatosConsolidado }) {
  const niveles = datos.indicadores[0]?.conteos ?? [];
  const cumplimiento = datos.nivelesCumplimiento.join(' y ');
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-sm text-slate-600">
            Resultado en {cumplimiento || 'los niveles de cumplimiento'}
          </dt>
          <dd className="text-2xl font-bold">
            {porcentaje(datos.porcentajeCumplimiento)}
          </dd>
          <dd className="text-xs text-slate-600">
            Promedio de los indicadores
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-sm text-slate-600">Porcentaje esperado</dt>
          <dd className="text-lg font-bold">
            {datos.metaDefinida
              ? porcentaje(datos.porcentajeEsperado)
              : META_NO_DEFINIDA}
          </dd>
          {datos.alcanzado !== null && (
            <dd className="mt-1">
              <Juicio alcanzado={datos.alcanzado} />
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
            Cohorte: {datos.tamanoCohorte}
            {datos.cohorteRegistrada ? '' : ' (no registrada: la muestra)'}
          </dd>
        </div>
      </dl>

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

      {/* Teléfono: una tarjeta por indicador. */}
      <ul className="space-y-3 sm:hidden">
        {datos.indicadores.map((indicador) => (
          <li
            key={indicador.idIndicador}
            className="space-y-2 rounded-xl border border-slate-200 p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">Indicador {indicador.numero}</p>
              <p className="text-lg font-bold">
                {porcentaje(indicador.porcentajeCumplimiento)}
              </p>
            </div>
            <Barra indicador={indicador} />
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
            <p className="text-xs text-slate-600">
              Muestra: {indicador.muestra}
              {indicador.sinValorar > 0 &&
                ` · ${indicador.sinValorar} sin valorar`}
            </p>
            {indicador.alcanzado !== null && (
              <Juicio alcanzado={indicador.alcanzado} />
            )}
          </li>
        ))}
      </ul>

      {/* Pantalla ancha: tabla resumen y porcentual, como la hoja del formato. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full text-sm">
          <caption className="sr-only">
            Estudiantes y porcentaje por nivel en cada indicador
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
              <tr key={indicador.idIndicador}>
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
                <td className="px-3 py-2 text-right align-top whitespace-nowrap">
                  <span className="block font-bold">
                    {porcentaje(indicador.porcentajeCumplimiento)}
                  </span>
                  {indicador.alcanzado !== null && (
                    <Juicio alcanzado={indicador.alcanzado} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

export function Juicio({ alcanzado }: { alcanzado: boolean }) {
  return alcanzado ? (
    <Insignia tono="marca">Alcanzado</Insignia>
  ) : (
    <Insignia tono="advertencia">No alcanzado</Insignia>
  );
}
