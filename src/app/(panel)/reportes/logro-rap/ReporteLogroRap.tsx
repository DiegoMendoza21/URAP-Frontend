'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import { etiquetaTipo, nombreRap } from '@/api/mediciones';
import {
  type ConsultaLogroRap,
  consultarFiltrosLogroRap,
  consultarLogroRap,
  descargarLogroRapExcel,
  type FiltrosLogroRap,
  type RapReporte,
  type ReporteLogroRap as DatosReporte,
} from '@/api/reportes';
import { porcentaje } from '@/componentes/formato';
import { Juicio, META_NO_DEFINIDA } from '../../mediciones/[id]/Consolidado';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/**
 * Reporte de logro de los RAP del programa (RF-32, HU-11-08): por cada RAP, las asignaturas
 * que lo evaluaron con medición cerrada y su porcentaje frente al esperado, los no evaluados y
 * la comparación con períodos anteriores. Se exporta a Excel (backend) y a PDF (impresión del
 * navegador). Solo datos agregados.
 */
export function ReporteLogroRap() {
  const filtros = useConsulta('filtros-logro-rap', consultarFiltrosLogroRap);
  // `numero` cambia con cada clic en «Generar reporte»: con los mismos filtros también se
  // vuelve a pedir, para traer las mediciones cerradas desde la última vez.
  const [solicitud, setSolicitud] = useState<{
    consulta: ConsultaLogroRap;
    numero: number;
  } | null>(null);
  const consulta = solicitud?.consulta ?? null;
  const reporte = useConsulta(
    solicitud === null ? null : `logro-rap-${solicitud.numero}`,
    (senal) => consultarLogroRap(solicitud!.consulta, senal),
  );

  return (
    <section aria-labelledby="titulo-reporte" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-sm font-medium text-marca hover:underline print:hidden"
        >
          ← Inicio
        </Link>
        <h1 id="titulo-reporte" className="text-2xl font-bold sm:text-3xl">
          Reporte de logro de los RAP
        </h1>
        {reporte.estado === 'lista' && (
          <p className="text-slate-700">
            {reporte.datos.programa.nombre} · Período{' '}
            {reporte.datos.periodo.codigo} · Generado el{' '}
            {formatoFecha.format(new Date(reporte.datos.generado))}
          </p>
        )}
      </div>

      {filtros.estado === 'cargando' && <Cargando />}
      {filtros.estado === 'fallida' && (
        <AvisoError
          mensaje={filtros.mensaje}
          reintentar={filtros.reintentable ? filtros.reintentar : undefined}
        />
      )}
      {filtros.estado === 'lista' && (
        <Filtros
          opciones={filtros.datos}
          alConsultar={(nueva) =>
            setSolicitud((anterior) => ({
              consulta: nueva,
              numero: (anterior?.numero ?? 0) + 1,
            }))
          }
        />
      )}

      {reporte.estado === 'cargando' && (
        <Cargando texto="Generando el reporte…" />
      )}
      {reporte.estado === 'fallida' && (
        <AvisoError
          mensaje={reporte.mensaje}
          reintentar={reporte.reintentable ? reporte.reintentar : undefined}
        />
      )}
      {reporte.estado === 'lista' && consulta && (
        <Resultado datos={reporte.datos} consulta={consulta} />
      )}
    </section>
  );
}

/** RF-32, p1: programa, período y, si se quiere, un RAP. */
function Filtros({
  opciones,
  alConsultar,
}: {
  opciones: FiltrosLogroRap;
  alConsultar: (consulta: ConsultaLogroRap) => void;
}) {
  const ids = { programa: useId(), periodo: useId(), rap: useId() };
  const [idPrograma, setIdPrograma] = useState(
    opciones.programas.length === 1 ? String(opciones.programas[0].id) : '',
  );
  const [idPeriodo, setIdPeriodo] = useState(
    opciones.periodos[0] ? String(opciones.periodos[0].id) : '',
  );
  const [idRap, setIdRap] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const programa = opciones.programas.find(
    (fila) => String(fila.id) === idPrograma,
  );

  if (opciones.programas.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        No tiene programas ni RAP a su cargo para consultar este reporte.
      </p>
    );
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!idPrograma || !idPeriodo) {
      setAviso('Seleccione el programa y el período académico.');
      return;
    }
    setAviso(null);
    alConsultar({
      idPrograma: Number(idPrograma),
      idPeriodo: Number(idPeriodo),
      idRap: idRap ? Number(idRap) : undefined,
    });
  };

  const claseCampo =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  return (
    <form
      onSubmit={enviar}
      noValidate
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 print:hidden"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor={ids.programa} className="block font-medium">
            Programa
          </label>
          <select
            id={ids.programa}
            value={idPrograma}
            onChange={(evento) => {
              setIdPrograma(evento.target.value);
              setIdRap('');
            }}
            className={claseCampo}
          >
            <option value="">Seleccione…</option>
            {opciones.programas.map((fila) => (
              <option key={fila.id} value={fila.id}>
                {fila.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.periodo} className="block font-medium">
            Período académico
          </label>
          <select
            id={ids.periodo}
            value={idPeriodo}
            onChange={(evento) => setIdPeriodo(evento.target.value)}
            className={claseCampo}
          >
            <option value="">Seleccione…</option>
            {opciones.periodos.map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.codigo}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.rap} className="block font-medium">
            RAP <span className="font-normal">(opcional)</span>
          </label>
          <select
            id={ids.rap}
            value={idRap}
            onChange={(evento) => setIdRap(evento.target.value)}
            className={claseCampo}
          >
            <option value="">Todos</option>
            {programa?.raps.map((rap) => (
              <option key={rap.id} value={rap.id}>
                {nombreRap(rap)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca sm:w-auto"
      >
        Generar reporte
      </button>
      {aviso && <AvisoError mensaje={aviso} />}
    </form>
  );
}

function Resultado({
  datos,
  consulta,
}: {
  datos: DatosReporte;
  consulta: ConsultaLogroRap;
}) {
  const [descarga, setDescarga] = useState<
    | { estado: 'inactiva' }
    | { estado: 'descargando' }
    | { estado: 'fallida'; mensaje: string }
  >({ estado: 'inactiva' });

  const exportarExcel = async () => {
    setDescarga({ estado: 'descargando' });
    try {
      const { archivo, nombre } = await descargarLogroRapExcel(consulta);
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      enlace.click();
      URL.revokeObjectURL(url);
      setDescarga({ estado: 'inactiva' });
    } catch (error) {
      setDescarga({ estado: 'fallida', mensaje: mensajeParaUsuario(error) });
    }
  };

  const evaluados = datos.raps.filter((rap) => rap.evaluado).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row print:hidden">
        <button
          type="button"
          onClick={() => void exportarExcel()}
          disabled={descarga.estado === 'descargando'}
          className="rounded-lg border border-marca px-4 py-3 font-semibold text-marca hover:bg-marca/5 disabled:opacity-60"
        >
          {descarga.estado === 'descargando'
            ? 'Preparando el Excel…'
            : 'Exportar a Excel'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-marca px-4 py-3 font-semibold text-marca hover:bg-marca/5"
        >
          Exportar a PDF
        </button>
      </div>
      <p className="text-sm text-slate-600 print:hidden">
        Para el PDF, elija «Guardar como PDF» en la ventana de impresión.
      </p>
      {descarga.estado === 'fallida' && (
        <AvisoError mensaje={descarga.mensaje} />
      )}

      <p className="text-sm text-slate-700">
        {evaluados} de {datos.raps.length}{' '}
        {datos.raps.length === 1 ? 'RAP evaluado' : 'RAP evaluados'} con
        mediciones cerradas en el período.{' '}
        {!datos.metaDefinida &&
          `${META_NO_DEFINIDA}: los resultados se presentan sin juicio de cumplimiento.`}
      </p>

      {datos.raps.map((rap) => (
        <TarjetaRap key={rap.id} rap={rap} periodo={datos.periodo.codigo} />
      ))}
    </div>
  );
}

function TarjetaRap({ rap, periodo }: { rap: RapReporte; periodo: string }) {
  return (
    <article
      aria-labelledby={`rap-${rap.id}`}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 print:break-inside-avoid print:shadow-none"
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`rap-${rap.id}`} className="text-lg font-semibold">
            {nombreRap(rap)}
          </h2>
          {rap.evaluado ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {porcentaje(rap.porcentajeCumplimiento)}
              </span>
              {rap.alcanzado !== null && <Juicio alcanzado={rap.alcanzado} />}
            </div>
          ) : (
            <Insignia tono="advertencia">No evaluado</Insignia>
          )}
        </div>
        {rap.descripcion && (
          <p className="text-sm text-slate-700">{rap.descripcion}</p>
        )}
        {rap.evaluado && (
          <p className="text-sm text-slate-600">
            Promedio de las asignaturas en los niveles de cumplimiento ·
            Esperado:{' '}
            {rap.porcentajeEsperado === null
              ? META_NO_DEFINIDA.toLowerCase()
              : porcentaje(rap.porcentajeEsperado)}
          </p>
        )}
      </header>

      {rap.evaluado ? (
        <section aria-label={`Asignaturas que evaluaron el ${nombreRap(rap)}`}>
          <h3 className="mb-2 font-semibold">Asignaturas que lo evaluaron</h3>
          <ul className="divide-y divide-slate-100">
            {rap.asignaturas.map((asignatura) => (
              <li key={asignatura.idMedicion} className="space-y-1 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {asignatura.asignatura}
                    {asignatura.grupo ? ` · Grupo ${asignatura.grupo}` : ''}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-bold">
                      {porcentaje(asignatura.porcentajeCumplimiento)}
                    </span>
                    {asignatura.alcanzado !== null && (
                      <Juicio alcanzado={asignatura.alcanzado} />
                    )}
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  {asignatura.docentes.join(', ') || 'Sin docente'} · Valoración{' '}
                  {etiquetaTipo(asignatura.tipoValoracion).toLowerCase()} ·
                  Muestra de {asignatura.tamanoMuestra}
                </p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                  {asignatura.indicadores.map((indicador) => (
                    <li key={indicador.numero ?? indicador.instrumento}>
                      Ind. {indicador.numero}:{' '}
                      {porcentaje(indicador.porcentajeCumplimiento)}
                      {indicador.instrumento && ` (${indicador.instrumento})`}
                    </li>
                  ))}
                </ul>
                {asignatura.accionesPropuestas && (
                  <p className="text-sm">
                    <span className="font-semibold">Acciones propuestas: </span>
                    {asignatura.accionesPropuestas}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-slate-700">
          El RAP no tiene mediciones cerradas en el período {periodo}.
        </p>
      )}

      <section aria-label={`Comparación del ${nombreRap(rap)}`}>
        <h3 className="mb-1 font-semibold">
          Comparación con períodos anteriores
        </h3>
        {rap.comparacion.length === 0 ? (
          <p className="text-sm text-slate-600">{rap.motivoSinComparacion}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {rap.comparacion.map((fila) => (
              <li key={fila.periodo} className="flex justify-between gap-3">
                <span>
                  {fila.periodo}{' '}
                  <span className="text-slate-600">
                    ({fila.mediciones}{' '}
                    {fila.mediciones === 1 ? 'medición' : 'mediciones'})
                  </span>
                </span>
                <span className="font-medium">
                  {porcentaje(fila.porcentajeCumplimiento)}
                </span>
              </li>
            ))}
            {rap.porcentajeCumplimiento !== null && (
              <li className="flex justify-between gap-3 font-semibold">
                <span>{periodo} (consultado)</span>
                <span>{porcentaje(rap.porcentajeCumplimiento)}</span>
              </li>
            )}
          </ul>
        )}
      </section>
    </article>
  );
}
