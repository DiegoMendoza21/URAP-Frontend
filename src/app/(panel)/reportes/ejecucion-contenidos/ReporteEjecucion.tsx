'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import {
  type ConsultaEjecucion,
  consultarEjecucion,
  type CursoEjecucion,
  descargarEjecucionExcel,
  type ReporteEjecucion as DatosReporte,
  type TemaEjecucion,
} from '@/api/reportes';
import {
  consultarFiltrosSeguimiento,
  type FiltrosSeguimiento,
} from '@/api/seguimiento';
import { porcentaje } from '@/componentes/formato';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../../proyectos-docentes/_componentes/Estados';
import { fechaCorta } from '../../proyectos-docentes/_componentes/fechas';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { Exportar } from '../_componentes/Exportar';

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** Cómo se lee cada estado de un tema planeado, con su color. */
const ESTADO_TEMA: Record<
  TemaEjecucion['estado'],
  { texto: string; tono: 'marca' | 'peligro' | 'neutro' }
> = {
  dictado: { texto: 'Dictado', tono: 'marca' },
  no_dictado: { texto: 'No dictado', tono: 'peligro' },
  por_dictar: { texto: 'Por dictar', tono: 'neutro' },
};

/**
 * HU-12-04: el registro de clase todavía no permite anotar temas fuera del contenido
 * programático (HU-08-05). Se dice para que el cero no se lea como un dato.
 */
const NOTA_ADICIONALES =
  'Los temas adicionales no planeados aparecen en cero: el registro de clase todavía no permite anotarlos.';

const temas = (cantidad: number) => (cantidad === 1 ? 'tema' : 'temas');

/**
 * Reporte de ejecución de contenidos (RF-28, HU-12-04): por curso, los temas planeados en el
 * punto 6 del proyecto docente frente a los marcados en las clases registradas. El backend
 * aplica el alcance del programa, clasifica cada tema y registra cada generación (p6).
 */
export function ReporteEjecucion() {
  const filtros = useConsulta('filtros-ejecucion', consultarFiltrosSeguimiento);
  // `numero` cambia con cada clic en «Generar reporte»: con los mismos filtros también se
  // vuelve a pedir.
  const [solicitud, setSolicitud] = useState<{
    consulta: ConsultaEjecucion;
    numero: number;
  } | null>(null);
  const reporte = useConsulta(
    solicitud === null ? null : `ejecucion-${solicitud.numero}`,
    (senal) => consultarEjecucion(solicitud!.consulta, senal),
  );

  return (
    <section aria-labelledby="titulo-ejecucion" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/reportes"
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline print:hidden"
        >
          ← Reportes
        </Link>
        <h1 id="titulo-ejecucion" className="text-2xl font-bold sm:text-3xl">
          Ejecución de contenidos
        </h1>
        <p className="text-slate-700">
          {reporte.estado === 'lista'
            ? `Período ${reporte.datos.periodo?.codigo ?? 'sin definir'} · Generado el ${formatoFecha.format(new Date(reporte.datos.generado))}`
            : 'Compare, por curso, los temas planeados en el punto 6 del proyecto docente con los que se dictaron en las clases registradas.'}
        </p>
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
          generado={solicitud !== null}
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

/**
 * HU-12-04: período y asignatura, más el programa como en los demás reportes de RF-28. En el
 * teléfono, una vez generado el reporte, los filtros se pliegan para que el resultado quede a la
 * vista, con un resumen de lo elegido; en pantallas anchas siempre se ven.
 */
function Filtros({
  opciones,
  generado,
  alConsultar,
}: {
  opciones: FiltrosSeguimiento;
  generado: boolean;
  alConsultar: (consulta: ConsultaEjecucion) => void;
}) {
  const ids = {
    formulario: useId(),
    periodo: useId(),
    programa: useId(),
    asignatura: useId(),
  };
  const [valores, setValores] = useState({
    idPeriodo: String(
      opciones.periodos.find((periodo) => periodo.vigente)?.id ??
        opciones.periodos[0]?.id ??
        '',
    ),
    idPrograma: '',
    idAsignatura: '',
  });
  // Antes de generar, abiertos: no hay nada más que mirar.
  const [abiertos, setAbiertos] = useState(true);
  const cambiar = (campo: keyof typeof valores, valor: string) =>
    setValores((actuales) => ({
      ...actuales,
      [campo]: valor,
      ...(campo === 'idPrograma' ? { idAsignatura: '' } : {}),
    }));
  const asignaturas = opciones.asignaturas.filter(
    (asignatura) =>
      !valores.idPrograma ||
      String(asignatura.idPrograma) === valores.idPrograma,
  );
  const numero = (valor: string) => (valor ? Number(valor) : undefined);
  const periodo = opciones.periodos.find(
    (fila) => String(fila.id) === valores.idPeriodo,
  );
  const otros = [valores.idPrograma, valores.idAsignatura].filter(
    Boolean,
  ).length;
  const resumen = [
    periodo ? `Período ${periodo.codigo}` : null,
    otros === 1 ? '1 filtro más' : otros > 1 ? `${otros} filtros más` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const plegados = generado && !abiertos;

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setAbiertos(false);
    alConsultar({
      idPeriodo: numero(valores.idPeriodo),
      idPrograma: numero(valores.idPrograma),
      idAsignatura: numero(valores.idAsignatura),
    });
  };

  const clase =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  const campos: {
    id: string;
    campo: keyof typeof valores;
    etiqueta: string;
    todas?: string;
    opciones: { valor: string; texto: string }[];
  }[] = [
    {
      id: ids.periodo,
      campo: 'idPeriodo',
      etiqueta: 'Período académico',
      opciones: opciones.periodos.map((fila) => ({
        valor: String(fila.id),
        texto: `${fila.codigo}${fila.vigente ? ' (vigente)' : ''}`,
      })),
    },
    {
      id: ids.programa,
      campo: 'idPrograma',
      etiqueta: 'Programa',
      todas: 'Todos',
      opciones: opciones.programas.map((programa) => ({
        valor: String(programa.id),
        texto: programa.nombre,
      })),
    },
    {
      id: ids.asignatura,
      campo: 'idAsignatura',
      etiqueta: 'Asignatura',
      todas: 'Todas',
      opciones: asignaturas.map((asignatura) => ({
        valor: String(asignatura.id),
        texto: asignatura.nombre,
      })),
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm print:hidden">
      {generado && (
        <button
          type="button"
          aria-expanded={abiertos}
          aria-controls={ids.formulario}
          onClick={() => setAbiertos((valor) => !valor)}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-marca sm:hidden"
        >
          <span>
            <span className="font-semibold">Filtros</span>
            {resumen && <span className="text-slate-600"> · {resumen}</span>}
          </span>
          <span className="shrink-0 text-sm font-semibold text-marca">
            {abiertos ? 'Ocultar' : 'Cambiar'}
          </span>
        </button>
      )}
      <form
        id={ids.formulario}
        onSubmit={enviar}
        noValidate
        className={`${plegados ? 'hidden' : 'block'} space-y-4 p-4 sm:block sm:p-6`}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {campos.map((campo) => (
            <div key={campo.id} className="space-y-1">
              <label htmlFor={campo.id} className="block font-medium">
                {campo.etiqueta}
              </label>
              <select
                id={campo.id}
                value={valores[campo.campo]}
                onChange={(evento) => cambiar(campo.campo, evento.target.value)}
                className={clase}
              >
                {campo.todas && <option value="">{campo.todas}</option>}
                {campo.opciones.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.texto}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca sm:w-auto"
        >
          Generar reporte
        </button>
      </form>
    </div>
  );
}

function Resultado({
  datos,
  consulta,
}: {
  datos: DatosReporte;
  consulta: ConsultaEjecucion;
}) {
  const { resumen } = datos;
  if (datos.cursos.length === 0) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm"
      >
        No hay proyectos docentes para los filtros seleccionados.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <Exportar descargar={() => descargarEjecucionExcel(consulta)} />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:col-span-1">
          <dt className="text-sm text-slate-600">Temas dictados</dt>
          <dd className="text-2xl font-bold">
            {porcentaje(resumen.porcentajeDictados)}
          </dd>
          <dd className="text-xs text-slate-600">
            {resumen.dictados} de {resumen.planeados} planeados ·{' '}
            {resumen.cursos} {resumen.cursos === 1 ? 'curso' : 'cursos'}
          </dd>
        </div>
        <Contador etiqueta="No dictados" valor={resumen.noDictados} />
        <Contador etiqueta="Por dictar" valor={resumen.porDictar} />
        <Contador
          etiqueta="Adicionales no planeados"
          valor={resumen.adicionales}
        />
      </dl>
      <p className="text-sm text-slate-600">
        «No dictado»: su semana ya terminó y no se marcó en ninguna clase. «Por
        dictar»: su semana todavía no termina. {NOTA_ADICIONALES}
      </p>

      <section aria-labelledby="titulo-cursos" className="space-y-2">
        <h2 id="titulo-cursos" className="font-semibold">
          Cursos
        </h2>
        <ul className="space-y-3">
          {datos.cursos.map((curso) => (
            <Curso key={curso.idProyecto} curso={curso} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Contador({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <dt className="text-sm text-slate-600">{etiqueta}</dt>
      <dd className="text-2xl font-bold">{valor}</dd>
    </div>
  );
}

/** Un curso: el resumen arriba y el detalle de los temas, plegado, abajo. */
function Curso({ curso }: { curso: CursoEjecucion }) {
  return (
    <li className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:break-inside-avoid print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/proyectos-docentes/${curso.idProyecto}`}
            className="font-semibold text-marca hover:underline"
          >
            {curso.asignatura}
            {curso.grupo ? ` · Grupo ${curso.grupo}` : ''}
          </Link>
          <p className="text-sm text-slate-600">
            {curso.docentes.join(', ') || 'Sin docente'}
            {curso.programa ? ` · ${curso.programa}` : ''}
          </p>
        </div>
        <Insignia tono="marca">{curso.estado?.nombre ?? 'Sin estado'}</Insignia>
      </div>

      {curso.planeados === 0 ? (
        <p className="text-sm text-slate-700">
          El punto 6 de este proyecto docente todavía no tiene temas por semana.
        </p>
      ) : (
        <>
          <p className="text-lg font-semibold">
            {curso.dictados} de {curso.planeados} {temas(curso.planeados)}{' '}
            {curso.dictados === 1 ? 'dictado' : 'dictados'}
            <span className="ml-2 text-sm font-normal text-slate-600">
              {porcentaje(curso.porcentajeDictados)}
            </span>
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label="Temas por estado">
            <li>
              <Insignia tono={curso.noDictados > 0 ? 'peligro' : 'neutro'}>
                No dictados: {curso.noDictados}
              </Insignia>
            </li>
            <li>
              <Insignia>Por dictar: {curso.porDictar}</Insignia>
            </li>
            <li>
              <Insignia>Adicionales: {curso.adicionales}</Insignia>
            </li>
          </ul>
          <details className="group rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-marca">
              Ver los {curso.planeados} {temas(curso.planeados)}
              {curso.temasAdicionales.length > 0
                ? ` y ${curso.temasAdicionales.length} adicionales`
                : ''}
            </summary>
            <ol className="mt-2 space-y-2">
              {curso.temas.map((tema, indice) => (
                <li
                  key={`${tema.semana ?? 'sin'}-${indice}`}
                  className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 border-t border-slate-200 pt-2 first:border-t-0 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-600">
                      {tema.semana === null
                        ? 'Sin semana'
                        : `Semana ${tema.semana}`}
                    </p>
                    <p className="break-words">{tema.tema}</p>
                    {tema.fechas.length > 0 && (
                      <p className="text-xs text-slate-600">
                        Dictado el {tema.fechas.map(fechaCorta).join(', ')}
                      </p>
                    )}
                  </div>
                  <Insignia tono={ESTADO_TEMA[tema.estado].tono}>
                    {ESTADO_TEMA[tema.estado].texto}
                  </Insignia>
                </li>
              ))}
              {curso.temasAdicionales.map((tema) => (
                <li
                  key={`adicional-${tema.tema}`}
                  className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 border-t border-slate-200 pt-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{tema.tema}</p>
                    {tema.fechas.length > 0 && (
                      <p className="text-xs text-slate-600">
                        Dictado el {tema.fechas.map(fechaCorta).join(', ')}
                      </p>
                    )}
                  </div>
                  <Insignia tono="informativo">Adicional no planeado</Insignia>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </li>
  );
}
