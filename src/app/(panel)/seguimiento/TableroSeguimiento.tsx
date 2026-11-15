'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import { guardarArchivo } from '@/api/descargas';
import {
  consultarFiltrosSeguimiento,
  consultarSeguimiento,
  descargarSeguimientoExcel,
  type FiltroSeguimiento,
  type FiltrosSeguimiento,
  type PaginaSeguimiento,
  type ProyectoSeguimiento,
  type VistaSeguimiento,
} from '@/api/seguimiento';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';
import { Evidencias, Secciones, Sesiones } from './Indicadores';
import { BORDE_COLOR, ETIQUETA_COLOR, Semaforo } from './Semaforo';

const TAMANO_PAGINA = 50;
/** El tamaño de página más grande que admite el backend: para traer todo al exportar a PDF. */
const TAMANO_PAGINA_MAXIMO = 100;

const formatoGeneracion = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

const VISTAS: { valor: VistaSeguimiento; etiqueta: string }[] = [
  { valor: 'tablero', etiqueta: 'Todos los proyectos' },
  { valor: 'pendientes', etiqueta: 'Con pendientes' },
];

/**
 * Tablero de seguimiento del diligenciamiento (RF-25; HU-12-01 y HU-12-02): el estado de los
 * proyectos docentes del período, con un color por proyecto, y la lista de los que tienen
 * pendientes, ordenada por gravedad. Lo calcula todo el backend.
 */
export function TableroSeguimiento() {
  const filtros = useConsulta(
    'filtros-seguimiento',
    consultarFiltrosSeguimiento,
  );
  const [filtro, setFiltro] = useState<FiltroSeguimiento>({});
  const [vista, setVista] = useState<VistaSeguimiento>('tablero');
  const [pagina, setPagina] = useState(1);
  const idPeriodo =
    filtro.idPeriodo ??
    (filtros.estado === 'lista' ? periodoPorDefecto(filtros.datos) : undefined);
  const consultaFinal = { ...filtro, idPeriodo };

  const datos = useConsulta(
    filtros.estado === 'lista'
      ? `seguimiento-${vista}-${pagina}-${JSON.stringify(consultaFinal)}`
      : null,
    (senal) =>
      consultarSeguimiento(vista, consultaFinal, pagina, TAMANO_PAGINA, senal),
  );

  const cambiarFiltro = (cambios: Partial<FiltroSeguimiento>) => {
    setFiltro((actual) => ({ ...actual, idPeriodo, ...cambios }));
    setPagina(1);
  };

  return (
    <section aria-labelledby="titulo-seguimiento" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline print:hidden"
        >
          ← Inicio
        </Link>
        <h1 id="titulo-seguimiento" className="text-2xl font-bold sm:text-3xl">
          Seguimiento del diligenciamiento
        </h1>
        <p className="text-slate-700">
          Estado de los proyectos docentes del período: secciones, sesiones
          registradas, evidencias y estado.
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
        <div className="print:hidden">
          <Filtros
            opciones={filtros.datos}
            filtro={consultaFinal}
            alCambiar={cambiarFiltro}
          />
        </div>
      )}

      <div
        role="group"
        aria-label="Mostrar"
        className="flex w-full rounded-lg border border-slate-300 text-sm sm:w-auto sm:self-start print:hidden"
      >
        {VISTAS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={vista === opcion.valor}
            onClick={() => {
              setVista(opcion.valor);
              setPagina(1);
            }}
            className={`flex-1 px-3 py-2 font-semibold first:rounded-l-lg last:rounded-r-lg sm:flex-none ${
              vista === opcion.valor
                ? 'bg-marca text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {datos.estado === 'cargando' && <Cargando />}
      {datos.estado === 'fallida' && (
        <AvisoError
          mensaje={datos.mensaje}
          reintentar={datos.reintentable ? datos.reintentar : undefined}
        />
      )}
      {datos.estado === 'lista' && (
        <Resultado
          datos={datos.datos}
          vista={vista}
          filtro={consultaFinal}
          filtrosAplicados={
            filtros.estado === 'lista'
              ? filtrosAplicados(filtros.datos, consultaFinal)
              : []
          }
          pagina={pagina}
          alCambiarPagina={setPagina}
        />
      )}
    </section>
  );
}

/** El período vigente más reciente; si no hay, el más reciente. */
function periodoPorDefecto(opciones: FiltrosSeguimiento): number | undefined {
  return (
    opciones.periodos.find((periodo) => periodo.vigente)?.id ??
    opciones.periodos[0]?.id
  );
}

function Filtros({
  opciones,
  filtro,
  alCambiar,
}: {
  opciones: FiltrosSeguimiento;
  filtro: FiltroSeguimiento;
  alCambiar: (cambios: Partial<FiltroSeguimiento>) => void;
}) {
  const ids = {
    formulario: useId(),
    periodo: useId(),
    programa: useId(),
    asignatura: useId(),
    docente: useId(),
  };
  // En el teléfono los cuatro filtros llenaban la primera pantalla y los contadores quedaban
  // debajo: llegan plegados, con el período y cuántos filtros más hay puestos. En pantallas
  // anchas siempre se ven.
  const [abiertos, setAbiertos] = useState(false);
  const periodo = opciones.periodos.find(
    (fila) => fila.id === filtro.idPeriodo,
  );
  const otros = [
    filtro.idPrograma,
    filtro.idAsignatura,
    filtro.idDocente,
  ].filter(Boolean).length;
  const resumen = [
    periodo ? `Período ${periodo.codigo}` : null,
    otros === 1 ? '1 filtro más' : otros > 1 ? `${otros} filtros más` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const asignaturas = opciones.asignaturas.filter(
    (asignatura) =>
      !filtro.idPrograma || asignatura.idPrograma === filtro.idPrograma,
  );
  const numero = (valor: string) => (valor ? Number(valor) : undefined);
  const clase =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
      <form
        id={ids.formulario}
        onSubmit={(evento) => evento.preventDefault()}
        className={`${abiertos ? 'grid' : 'hidden'} gap-3 px-4 pb-4 sm:grid sm:grid-cols-2 sm:p-6 lg:grid-cols-4`}
      >
        <div className="space-y-1">
          <label htmlFor={ids.periodo} className="block font-medium">
            Período académico
          </label>
          <select
            id={ids.periodo}
            value={filtro.idPeriodo ?? ''}
            onChange={(evento) =>
              alCambiar({ idPeriodo: numero(evento.target.value) })
            }
            className={clase}
          >
            {opciones.periodos.map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.codigo}
                {periodo.vigente ? ' (vigente)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.programa} className="block font-medium">
            Programa
          </label>
          <select
            id={ids.programa}
            value={filtro.idPrograma ?? ''}
            onChange={(evento) =>
              alCambiar({
                idPrograma: numero(evento.target.value),
                idAsignatura: undefined,
              })
            }
            className={clase}
          >
            <option value="">Todos</option>
            {opciones.programas.map((programa) => (
              <option key={programa.id} value={programa.id}>
                {programa.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.asignatura} className="block font-medium">
            Asignatura
          </label>
          <select
            id={ids.asignatura}
            value={filtro.idAsignatura ?? ''}
            onChange={(evento) =>
              alCambiar({ idAsignatura: numero(evento.target.value) })
            }
            className={clase}
          >
            <option value="">Todas</option>
            {asignaturas.map((asignatura) => (
              <option key={asignatura.id} value={asignatura.id}>
                {asignatura.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.docente} className="block font-medium">
            Docente
          </label>
          <select
            id={ids.docente}
            value={filtro.idDocente ?? ''}
            onChange={(evento) =>
              alCambiar({ idDocente: numero(evento.target.value) })
            }
            className={clase}
          >
            <option value="">Todos</option>
            {opciones.docentes.map((docente) => (
              <option key={docente.id} value={docente.id}>
                {docente.nombre}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
}

/**
 * Los filtros puestos, en palabras, para el encabezado del PDF (HU-12-06: la exportación
 * conserva los filtros aplicados).
 */
function filtrosAplicados(
  opciones: FiltrosSeguimiento,
  filtro: FiltroSeguimiento,
): string[] {
  const nombre = (
    lista: readonly { id: number; nombre: string }[],
    id: number | undefined,
  ) => (id ? lista.find((opcion) => opcion.id === id)?.nombre : undefined);
  const periodo = opciones.periodos.find(
    (opcion) => opcion.id === filtro.idPeriodo,
  );
  return [
    periodo ? `Período ${periodo.codigo}` : null,
    nombre(opciones.programas, filtro.idPrograma)
      ? `Programa: ${nombre(opciones.programas, filtro.idPrograma)}`
      : null,
    nombre(opciones.asignaturas, filtro.idAsignatura)
      ? `Asignatura: ${nombre(opciones.asignaturas, filtro.idAsignatura)}`
      : null,
    nombre(opciones.docentes, filtro.idDocente)
      ? `Docente: ${nombre(opciones.docentes, filtro.idDocente)}`
      : null,
  ].filter((texto): texto is string => texto !== null);
}

/**
 * HU-12-06: todos los proyectos de la consulta, no solo la página visible, para el PDF. Con
 * el tamaño de página máximo del backend, casi siempre es una sola petición.
 */
async function todosLosProyectos(
  vista: VistaSeguimiento,
  filtro: FiltroSeguimiento,
  datos: PaginaSeguimiento,
): Promise<ProyectoSeguimiento[]> {
  if (datos.total <= datos.elementos.length) {
    return datos.elementos;
  }
  const paginas = Math.ceil(datos.total / TAMANO_PAGINA_MAXIMO);
  const proyectos: ProyectoSeguimiento[] = [];
  for (let pagina = 1; pagina <= paginas; pagina++) {
    const respuesta = await consultarSeguimiento(
      vista,
      filtro,
      pagina,
      TAMANO_PAGINA_MAXIMO,
    );
    proyectos.push(...respuesta.elementos);
  }
  return proyectos;
}

function Resultado({
  datos,
  vista,
  filtro,
  filtrosAplicados,
  pagina,
  alCambiarPagina,
}: {
  datos: PaginaSeguimiento;
  vista: VistaSeguimiento;
  filtro: FiltroSeguimiento;
  filtrosAplicados: readonly string[];
  pagina: number;
  alCambiarPagina: (pagina: number) => void;
}) {
  const [descarga, setDescarga] = useState<
    | { estado: 'inactiva' }
    | { estado: 'descargando' }
    | { estado: 'fallida'; mensaje: string }
  >({ estado: 'inactiva' });
  const totalPaginas = Math.max(1, Math.ceil(datos.total / datos.tamano));
  const { resumen } = datos;

  // HU-12-06: el PDF es la impresión del navegador («Guardar como PDF»), como en los reportes.
  // Antes se traen todos los proyectos de la consulta y se arma una tabla solo para imprimir.
  const [impresion, setImpresion] = useState<{
    proyectos: ProyectoSeguimiento[];
    generado: Date;
  } | null>(null);
  const [preparandoPdf, setPreparandoPdf] = useState(false);

  useEffect(() => {
    if (!impresion) {
      return;
    }
    const terminar = () => setImpresion(null);
    window.addEventListener('afterprint', terminar);
    window.print();
    return () => window.removeEventListener('afterprint', terminar);
  }, [impresion]);

  const exportarPdf = async () => {
    setPreparandoPdf(true);
    setDescarga({ estado: 'inactiva' });
    try {
      setImpresion({
        proyectos: await todosLosProyectos(vista, filtro, datos),
        generado: new Date(),
      });
    } catch (error) {
      setDescarga({ estado: 'fallida', mensaje: mensajeParaUsuario(error) });
    } finally {
      setPreparandoPdf(false);
    }
  };

  const exportar = async () => {
    setDescarga({ estado: 'descargando' });
    try {
      guardarArchivo(await descargarSeguimientoExcel(vista, filtro));
      setDescarga({ estado: 'inactiva' });
    } catch (error) {
      setDescarga({ estado: 'fallida', mensaje: mensajeParaUsuario(error) });
    }
  };

  return (
    <div className="space-y-4">
      <ul aria-label="Resumen del período" className="flex flex-wrap gap-2">
        <li>
          <Insignia>
            {resumen.proyectos}{' '}
            {resumen.proyectos === 1 ? 'proyecto' : 'proyectos'}
            {datos.periodo ? ` · ${datos.periodo.codigo}` : ''}
          </Insignia>
        </li>
        {(['rojo', 'amarillo', 'verde'] as const).map((color) => (
          <li
            key={color}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 ring-1 ring-slate-200"
          >
            <Semaforo color={color} />
            <span className="text-sm font-bold">{resumen[color]}</span>
          </li>
        ))}
      </ul>

      {datos.total === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          {vista === 'pendientes' && resumen.proyectos > 0
            ? 'Ningún proyecto tiene pendientes con estos filtros: todos están al día.'
            : 'No hay proyectos docentes para los filtros seleccionados.'}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {vista === 'pendientes'
                ? `${datos.total} con pendientes, del más grave al menos grave.`
                : `${datos.total} ${datos.total === 1 ? 'proyecto' : 'proyectos'}.`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row print:hidden">
              <button
                type="button"
                onClick={() => void exportar()}
                disabled={descarga.estado === 'descargando'}
                className="min-h-11 rounded-lg border border-marca px-4 py-2 font-semibold text-marca hover:bg-marca/5 disabled:opacity-60"
              >
                {descarga.estado === 'descargando'
                  ? 'Preparando el Excel…'
                  : 'Exportar a Excel'}
              </button>
              <button
                type="button"
                onClick={() => void exportarPdf()}
                disabled={preparandoPdf}
                className="min-h-11 rounded-lg border border-marca px-4 py-2 font-semibold text-marca hover:bg-marca/5 disabled:opacity-60"
              >
                {preparandoPdf ? 'Preparando el PDF…' : 'Exportar a PDF'}
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-600 print:hidden">
            Para el PDF, elija «Guardar como PDF» en la ventana de impresión.
            Incluye todos los proyectos de la consulta, no solo esta página.
          </p>
          {descarga.estado === 'fallida' && (
            <AvisoError mensaje={descarga.mensaje} />
          )}

          {/* Solo al imprimir: todos los proyectos, con los filtros aplicados (HU-12-06). */}
          <div className="hidden space-y-2 print:block">
            <p className="text-sm text-slate-700">
              {[
                vista === 'pendientes'
                  ? 'Con pendientes'
                  : 'Todos los proyectos',
                ...filtrosAplicados,
              ].join(' · ')}
            </p>
            <p className="text-sm text-slate-700">
              Generado el{' '}
              {formatoGeneracion.format(impresion?.generado ?? new Date())}
            </p>
            <TablaProyectos
              proyectos={impresion?.proyectos ?? datos.elementos}
              enlaces={false}
            />
          </div>

          <div className="space-y-4 print:hidden">
            {/* Teléfono: una tarjeta por proyecto, con el borde de su color. */}
            <ul className="space-y-3 md:hidden">
              {datos.elementos.map((proyecto) => (
                <li key={proyecto.idProyecto}>
                  <Tarjeta proyecto={proyecto} />
                </li>
              ))}
            </ul>

            {/* Pantalla ancha: una tabla para recorrer muchos proyectos. */}
            <div className="hidden md:block">
              <TablaProyectos proyectos={datos.elementos} enlaces />
            </div>

            {totalPaginas > 1 && (
              <nav
                aria-label="Páginas"
                className="flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => alCambiarPagina(pagina - 1)}
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
                  onClick={() => alCambiarPagina(pagina + 1)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold disabled:opacity-40"
                >
                  Siguiente
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Los proyectos en una tabla: en pantalla ancha, con enlace a cada proyecto; al imprimir el
 * PDF (HU-12-06), todos los de la consulta y sin enlaces.
 */
function TablaProyectos({
  proyectos,
  enlaces,
}: {
  proyectos: readonly ProyectoSeguimiento[];
  enlaces: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <table className="min-w-full text-sm">
        <caption className="sr-only">
          Estado de diligenciamiento por proyecto docente
        </caption>
        <thead className="bg-slate-50 text-left">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Proyecto
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Color
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Secciones
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Sesiones
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Evidencias por RAP
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {proyectos.map((proyecto) => {
            const nombre = `${proyecto.asignatura}${proyecto.grupo ? ` · Grupo ${proyecto.grupo}` : ''}`;
            return (
              <tr
                key={proyecto.idProyecto}
                className="break-inside-avoid align-top"
              >
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {enlaces ? (
                    <Link
                      href={`/proyectos-docentes/${proyecto.idProyecto}`}
                      className="font-semibold text-marca hover:underline"
                    >
                      {nombre}
                    </Link>
                  ) : (
                    <span className="font-semibold">{nombre}</span>
                  )}
                  <span className="block text-xs text-slate-600">
                    {proyecto.docentes.join(', ') || 'Sin docente'}
                  </span>
                </th>
                <td className="px-3 py-2">
                  <Semaforo color={proyecto.color} />
                  <span className="block text-xs text-slate-600">
                    {proyecto.motivoColor}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Secciones proyecto={proyecto} />
                </td>
                <td className="px-3 py-2">
                  <Sesiones proyecto={proyecto} />
                </td>
                <td className="px-3 py-2">
                  <Evidencias proyecto={proyecto} />
                </td>
                <td className="px-3 py-2">
                  {proyecto.estado?.nombre ?? 'Sin estado'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Tarjeta({ proyecto }: { proyecto: ProyectoSeguimiento }) {
  return (
    <article
      aria-label={`${proyecto.asignatura}: ${ETIQUETA_COLOR[proyecto.color]}`}
      className={`space-y-2 rounded-2xl border border-l-8 border-slate-200 bg-white p-4 shadow-sm ${BORDE_COLOR[proyecto.color]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {proyecto.asignatura}
            {proyecto.grupo ? ` · Grupo ${proyecto.grupo}` : ''}
          </p>
          <p className="text-sm text-slate-600">
            {proyecto.docentes.join(', ') || 'Sin docente'}
          </p>
        </div>
        <Semaforo color={proyecto.color} />
      </div>
      <p className="text-sm text-slate-700">{proyecto.motivoColor}</p>
      <dl className="grid grid-cols-1 gap-2 text-sm">
        <div>
          <dt className="font-medium text-slate-600">Secciones</dt>
          <dd>
            <Secciones proyecto={proyecto} />
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">Sesiones</dt>
          <dd>
            <Sesiones proyecto={proyecto} />
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">Evidencias por RAP</dt>
          <dd>
            <Evidencias proyecto={proyecto} />
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">Estado</dt>
          <dd>{proyecto.estado?.nombre ?? 'Sin estado'}</dd>
        </div>
      </dl>
      <Link
        href={`/proyectos-docentes/${proyecto.idProyecto}`}
        className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 font-semibold text-marca hover:underline"
      >
        Abrir el proyecto →
      </Link>
    </article>
  );
}
