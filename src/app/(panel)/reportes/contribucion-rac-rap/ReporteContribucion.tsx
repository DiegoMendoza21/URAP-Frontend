'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { nombreRap } from '@/api/mediciones';
import {
  type ConsultaContribucion,
  consultarContribucion,
  consultarFiltrosLogroRap,
  descargarContribucionExcel,
  type FiltrosLogroRap,
  type RapContribucion,
  type ReporteContribucion as DatosReporte,
} from '@/api/reportes';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { Exportar } from '../_componentes/Exportar';

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});
const formatoDia = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeZone: 'America/Bogota',
});

/**
 * Reporte de contribución RAC-RAP (RF-28, HU-12-05): por cada RAP, las asignaturas del período
 * que contribuyen a él, sus docentes, los RAC relacionados y las evidencias cargadas. El
 * backend solo devuelve los RAP que el usuario puede consultar: al líder RAP, los que lidera.
 */
export function ReporteContribucion() {
  // Las opciones son las del reporte de logro (RF-32): el mismo alcance por programa y por
  // liderazgo de RAP.
  const filtros = useConsulta('filtros-contribucion', consultarFiltrosLogroRap);
  const [solicitud, setSolicitud] = useState<{
    consulta: ConsultaContribucion;
    numero: number;
  } | null>(null);
  const reporte = useConsulta(
    solicitud === null ? null : `contribucion-${solicitud.numero}`,
    (senal) => consultarContribucion(solicitud!.consulta, senal),
  );

  return (
    <section aria-labelledby="titulo-contribucion" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-sm font-medium text-marca hover:underline print:hidden"
        >
          ← Inicio
        </Link>
        <h1 id="titulo-contribucion" className="text-2xl font-bold sm:text-3xl">
          Contribución de los RAC a los RAP
        </h1>
        {reporte.estado === 'lista' && (
          <p className="text-slate-700">
            Período {reporte.datos.periodo?.codigo ?? 'sin definir'} · Generado
            el {formatoFecha.format(new Date(reporte.datos.generado))}
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
          alConsultar={(consulta) =>
            setSolicitud((anterior) => ({
              consulta,
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
      {reporte.estado === 'lista' && solicitud && (
        <Resultado datos={reporte.datos} consulta={solicitud.consulta} />
      )}
    </section>
  );
}

/** RF-28, p2: período y, si se quiere, un RAP. */
function Filtros({
  opciones,
  alConsultar,
}: {
  opciones: FiltrosLogroRap;
  alConsultar: (consulta: ConsultaContribucion) => void;
}) {
  const ids = { periodo: useId(), rap: useId() };
  // Vacío: el período vigente, que elige el backend. El primero de la lista puede ser uno
  // creado por adelantado que todavía no empieza.
  const [idPeriodo, setIdPeriodo] = useState('');
  const [idRap, setIdRap] = useState('');
  const programas = opciones.programas.filter(
    (programa) => programa.raps.length > 0,
  );

  if (programas.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        No tiene RAP a su cargo para consultar este reporte.
      </p>
    );
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    alConsultar({
      idPeriodo: idPeriodo ? Number(idPeriodo) : undefined,
      idRap: idRap ? Number(idRap) : undefined,
    });
  };

  const opcionesRap = (raps: (typeof programas)[number]['raps']) =>
    raps.map((rap) => (
      <option key={rap.id} value={rap.id}>
        {nombreRap(rap)}
      </option>
    ));
  const claseCampo =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  return (
    <form
      onSubmit={enviar}
      noValidate
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 print:hidden"
    >
      <div className="grid gap-3 sm:grid-cols-2">
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
            <option value="">El vigente</option>
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
            {programas.length === 1
              ? opcionesRap(programas[0].raps)
              : programas.map((programa) => (
                  <optgroup key={programa.id} label={programa.nombre}>
                    {opcionesRap(programa.raps)}
                  </optgroup>
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
    </form>
  );
}

function Resultado({
  datos,
  consulta,
}: {
  datos: DatosReporte;
  consulta: ConsultaContribucion;
}) {
  if (datos.raps.length === 0) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm"
      >
        No hay RAP para consultar en el período seleccionado.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <Exportar descargar={() => descargarContribucionExcel(consulta)} />
      <ul className="space-y-4">
        {datos.raps.map((rap) => (
          <li key={rap.id}>
            <TarjetaRap rap={rap} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TarjetaRap({ rap }: { rap: RapContribucion }) {
  const titulo = useId();
  return (
    <section
      aria-labelledby={titulo}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 print:break-inside-avoid print:shadow-none"
    >
      <div className="space-y-1">
        <h2 id={titulo} className="text-lg font-semibold">
          {nombreRap(rap)}
        </h2>
        {rap.descripcion && (
          <p className="text-sm text-slate-700">{rap.descripcion}</p>
        )}
      </div>

      {rap.asignaturas.length === 0 ? (
        <p className="text-sm text-slate-600">
          Ninguna asignatura del período contribuye a este RAP.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {rap.asignaturas.map((asignatura) => (
            <li key={asignatura.idProyecto} className="space-y-2 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/proyectos-docentes/${asignatura.idProyecto}`}
                    className="font-semibold text-marca hover:underline"
                  >
                    {asignatura.asignatura}
                    {asignatura.grupo ? ` · Grupo ${asignatura.grupo}` : ''}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {asignatura.docentes.join(', ') || 'Sin docente'}
                  </p>
                </div>
                <Insignia tono="marca">
                  {asignatura.estado?.nombre ?? 'Sin estado'}
                </Insignia>
              </div>
              {asignatura.racs.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Todavía no tiene RAC asociados a este RAP.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {asignatura.racs.map((rac, indice) => (
                    <li key={`${rac.codigo ?? 'rac'}-${indice}`}>
                      <span className="font-medium">{rac.codigo ?? 'RAC'}</span>
                      {rac.descripcion ? `: ${rac.descripcion}` : ''}
                      {rac.contribucion && (
                        <span className="block text-slate-600">
                          Contribución: {rac.contribucion}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-700">
                {asignatura.evidencias === 0
                  ? 'Sin evidencias cargadas para este RAP.'
                  : `${asignatura.evidencias} ${
                      asignatura.evidencias === 1 ? 'evidencia' : 'evidencias'
                    }${
                      asignatura.ultimaEvidencia
                        ? ` · la más reciente del ${formatoDia.format(
                            new Date(asignatura.ultimaEvidencia),
                          )}`
                        : ''
                    }`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
