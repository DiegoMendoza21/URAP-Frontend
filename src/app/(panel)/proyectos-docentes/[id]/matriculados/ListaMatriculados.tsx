'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useId, useRef, useState, type FormEvent } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  cargarListaMatriculados,
  COLUMNAS_LISTA,
  consultarMatriculados,
  type EstadoMatricula,
  type ResultadoCargaMatriculados,
} from '@/api/matriculados';
import { consultarProyectoDocente } from '@/api/proyectos-docentes';
import { useSesion } from '@/sesion/ProveedorSesion';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';

/** El backend no entrega más de 100 por página; un curso cabe casi siempre en una. */
const TAMANO_PAGINA = 100;
/** Quien carga la lista (HU-09-01). Mostrar el formulario es presentación: decide el backend. */
const ROL_ADMINISTRADOR = 'Administrador';

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
});

/**
 * Lista de estudiantes matriculados del curso (RF-22, HU-09-01). El Administrador la carga
 * desde un Excel; el Administrador y los docentes del curso la consultan. Son datos personales
 * (Ley 1581 de 2012): el backend responde 404 a quien no debe verla.
 */
export function ListaMatriculados() {
  const { sesion } = useSesion();
  const idProyecto = useIdProyecto();
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState<EstadoMatricula>('matriculado');
  const [version, setVersion] = useState(0);
  /** Hubo una carga en esta visita: el formulario sigue visible mientras se recarga la lista. */
  const [huboCarga, setHuboCarga] = useState(false);

  const proyecto = useConsulta(
    idProyecto === null ? null : `proyecto-${idProyecto}`,
    (senal) => consultarProyectoDocente(idProyecto!, senal),
  );
  const lista = useConsulta(
    idProyecto === null
      ? null
      : `matriculados-${idProyecto}-${estado}-${pagina}-${version}`,
    (senal) =>
      consultarMatriculados(
        idProyecto!,
        { pagina, tamano: TAMANO_PAGINA, estado },
        senal,
      ),
  );
  const esAdministrador =
    sesion.estado === 'autenticado' &&
    sesion.usuario.roles.includes(ROL_ADMINISTRADOR);

  const totalPaginas =
    lista.estado === 'lista'
      ? Math.max(1, Math.ceil(lista.datos.total / TAMANO_PAGINA))
      : 1;
  const cambiarEstado = (nuevo: EstadoMatricula) => {
    setEstado(nuevo);
    setPagina(1);
  };

  return (
    <section aria-labelledby="titulo-matriculados" className="space-y-6">
      <div className="space-y-1">
        <Link
          href={
            idProyecto === null
              ? '/proyectos-docentes'
              : `/proyectos-docentes/${idProyecto}`
          }
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Proyecto docente
        </Link>
        <h1 id="titulo-matriculados" className="text-2xl font-bold sm:text-3xl">
          Estudiantes matriculados
        </h1>
        {proyecto.estado === 'lista' && (
          <p className="text-slate-700">
            {proyecto.datos.asignatura}
            {proyecto.datos.grupo ? ` · Grupo ${proyecto.datos.grupo}` : ''} ·
            Período {proyecto.datos.periodo}
          </p>
        )}
      </div>

      {idProyecto === null && (
        <AvisoError mensaje="El proyecto docente no existe o no tiene acceso a él." />
      )}
      {lista.estado === 'cargando' && <Cargando />}
      {lista.estado === 'fallida' && (
        <AvisoError
          mensaje={lista.mensaje}
          reintentar={lista.reintentable ? lista.reintentar : undefined}
        />
      )}

      {lista.estado === 'lista' && (
        <>
          {lista.datos.ultimaCarga ? (
            <p className="text-sm text-slate-700">
              <strong>{lista.datos.totalMatriculados}</strong>{' '}
              {lista.datos.totalMatriculados === 1
                ? 'estudiante matriculado'
                : 'estudiantes matriculados'}
              . Última carga:{' '}
              {formatoFecha.format(new Date(lista.datos.ultimaCarga.fecha))},
              por {lista.datos.ultimaCarga.cargadoPor}.
            </p>
          ) : (
            <Advertencia titulo="Este curso todavía no tiene la lista de estudiantes.">
              {esAdministrador ? (
                <p>Cárguela con el formulario de abajo.</p>
              ) : (
                <p>
                  Pídale al administrador de URAP que la cargue: indique la
                  asignatura, el grupo y el período de este curso.
                </p>
              )}
            </Advertencia>
          )}
        </>
      )}

      {/* Fuera del bloque de la lista: al recargarla no se pierde el resumen de la carga. */}
      {esAdministrador &&
        idProyecto !== null &&
        (huboCarga || lista.estado === 'lista') && (
          <CargaLista
            idProyecto={idProyecto}
            hayLista={
              huboCarga ||
              (lista.estado === 'lista' && lista.datos.ultimaCarga !== null)
            }
            alCargar={() => {
              setHuboCarga(true);
              setEstado('matriculado');
              setPagina(1);
              setVersion((valor) => valor + 1);
            }}
          />
        )}

      {lista.estado === 'lista' && (
        <>
          {lista.datos.ultimaCarga && (
            <section
              aria-labelledby="titulo-lista"
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-lista" className="text-lg font-semibold">
                  {estado === 'matriculado' ? 'Matriculados' : 'Retirados'}
                </h2>
                {(lista.datos.totalRetirados > 0 || estado === 'retirado') && (
                  <div
                    role="group"
                    aria-label="Mostrar"
                    className="flex rounded-lg border border-slate-300 text-sm"
                  >
                    {(['matriculado', 'retirado'] as const).map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        aria-pressed={estado === opcion}
                        onClick={() => cambiarEstado(opcion)}
                        className={`px-3 py-2 font-semibold first:rounded-l-lg last:rounded-r-lg ${
                          estado === opcion
                            ? 'bg-marca text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opcion === 'matriculado'
                          ? `Matriculados (${lista.datos.totalMatriculados})`
                          : `Retirados (${lista.datos.totalRetirados})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {estado === 'retirado' && (
                <p className="text-sm text-slate-600">
                  Estaban en una carga anterior y no en la última. Se conservan
                  con sus inasistencias y valoraciones.
                </p>
              )}

              {lista.datos.elementos.length === 0 ? (
                <p className="py-4 text-sm text-slate-600">
                  No hay estudiantes en esta lista.
                </p>
              ) : (
                <ol
                  start={(pagina - 1) * TAMANO_PAGINA + 1}
                  className="divide-y divide-slate-100"
                >
                  {lista.datos.elementos.map((estudiante) => (
                    <li
                      key={estudiante.idMatricula}
                      className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                    >
                      <span className="font-medium">
                        {estudiante.apellidos}, {estudiante.nombres}
                      </span>
                      <span className="text-sm text-slate-600">
                        Doc. {estudiante.documento}
                        {estudiante.correo ? ` · ${estudiante.correo}` : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {totalPaginas > 1 && (
                <nav
                  aria-label="Páginas de la lista"
                  className="flex items-center justify-between gap-2 pt-2"
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
          )}
        </>
      )}
    </section>
  );
}

type EstadoCarga =
  | { estado: 'inactiva' }
  | { estado: 'enviando' }
  | { estado: 'cargada'; resultado: ResultadoCargaMatriculados }
  | { estado: 'fallida'; mensaje: string; detalles?: string[] };

/** Formulario del Administrador para cargar o reemplazar la lista del curso (HU-09-01). */
function CargaLista({
  idProyecto,
  hayLista,
  alCargar,
}: {
  idProyecto: number;
  hayLista: boolean;
  alCargar: () => void;
}) {
  const idCampo = useId();
  const idAyuda = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [carga, setCarga] = useState<EstadoCarga>({ estado: 'inactiva' });

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!archivo) {
      setCarga({
        estado: 'fallida',
        mensaje: 'Seleccione el archivo de Excel con la lista de estudiantes.',
      });
      return;
    }
    setCarga({ estado: 'enviando' });
    try {
      const resultado = await cargarListaMatriculados(idProyecto, archivo);
      setCarga({ estado: 'cargada', resultado });
      setArchivo(null);
      if (campo.current) {
        campo.current.value = '';
      }
      alCargar();
    } catch (error) {
      setCarga({
        estado: 'fallida',
        mensaje: mensajeParaUsuario(error),
        detalles: error instanceof ErrorApi ? error.detalles : undefined,
      });
    }
  };

  return (
    <section
      aria-labelledby="titulo-carga"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 id="titulo-carga" className="text-lg font-semibold">
          {hayLista ? 'Reemplazar la lista' : 'Cargar la lista'}
        </h2>
        <div id={idAyuda} className="space-y-1 text-sm text-slate-700">
          <p>
            Un libro de Excel (.xlsx). En la primera fila, los títulos{' '}
            {COLUMNAS_LISTA.slice(0, 3).map((columna, indice) => (
              <span key={columna}>
                {indice > 0 && (indice === 2 ? ' y ' : ', ')}
                <strong>{columna}</strong>
              </span>
            ))}
            ; si quiere, también <strong>{COLUMNAS_LISTA[3]}</strong>. Debajo,
            un estudiante por fila.
          </p>
          {hayLista && (
            <p>
              La lista nueva reemplaza la actual. Quien no aparezca en el
              archivo queda como retirado; no se borra.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={enviar} className="space-y-3" noValidate>
        <div className="space-y-1">
          <label htmlFor={idCampo} className="block font-medium">
            Archivo de la lista
          </label>
          <input
            ref={campo}
            id={idCampo}
            name="archivo"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-describedby={idAyuda}
            onChange={(evento) => {
              setArchivo(evento.target.files?.[0] ?? null);
              setCarga({ estado: 'inactiva' });
            }}
            className="block w-full rounded-lg border border-slate-300 bg-white text-sm file:mr-3 file:rounded-l-lg file:border-0 file:bg-slate-100 file:px-4 file:py-3 file:font-semibold file:text-slate-800"
          />
        </div>
        <button
          type="submit"
          disabled={carga.estado === 'enviando'}
          className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-60 sm:w-auto"
        >
          {carga.estado === 'enviando' ? 'Cargando…' : 'Cargar lista'}
        </button>
      </form>

      {carga.estado === 'fallida' && (
        <AvisoError mensaje={carga.mensaje} detalles={carga.detalles} />
      )}
      {carga.estado === 'cargada' && (
        <ResumenCarga resultado={carga.resultado} />
      )}
    </section>
  );
}

function ResumenCarga({
  resultado,
}: {
  resultado: ResultadoCargaMatriculados;
}) {
  const cifras = [
    {
      valor: resultado.nuevos,
      texto: ['nuevo en el curso', 'nuevos en el curso'],
    },
    {
      valor: resultado.reincorporados,
      texto: ['reincorporado', 'reincorporados'],
    },
    {
      valor: resultado.retirados,
      texto: ['pasó a retirados', 'pasaron a retirados'],
    },
    {
      valor: resultado.actualizados,
      texto: [
        'con nombres o correo corregidos',
        'con nombres o correo corregidos',
      ],
    },
  ].filter((cifra) => cifra.valor > 0);
  return (
    <div
      role="status"
      className="space-y-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900"
    >
      <p className="font-semibold">
        Lista cargada: {resultado.matriculados}{' '}
        {resultado.matriculados === 1 ? 'estudiante' : 'estudiantes'}.
      </p>
      {cifras.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cifras.map((cifra) => (
            <Insignia key={cifra.texto[1]}>
              {cifra.valor} {cifra.texto[cifra.valor === 1 ? 0 : 1]}
            </Insignia>
          ))}
        </div>
      )}
    </div>
  );
}

/** Identificador numérico del proyecto en la ruta, o nulo si no lo es. */
function useIdProyecto(): number | null {
  const { id } = useParams<{ id: string }>();
  return /^\d+$/.test(id) ? Number(id) : null;
}
