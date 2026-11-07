'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  type EstudianteMedicion,
  type IndicadorMedicion,
  type MedicionDetalle,
  type NivelEscala,
  registrarValoraciones,
  type Valoracion as CeldaValoracion,
} from '@/api/mediciones';

/** Espera tras el último toque antes de guardar: agrupa varios cambios en una solicitud. */
const ESPERA_GUARDADO_MS = 900;
/** Pestaña de la vista de matriz, junto a las de cada indicador. */
const VISTA_MATRIZ = 'matriz';

type EstadoGuardado =
  | { estado: 'al-dia' }
  | { estado: 'pendiente' }
  | { estado: 'guardando' }
  | { estado: 'guardado' }
  | { estado: 'fallido'; mensaje: string; reintentable: boolean };

const clave = (idMatricula: number, idIndicador: number) =>
  `${idMatricula}:${idIndicador}`;

/**
 * Hoja «Valoración» del formato FO-DO/PC-023 (RF-30, p5 y p6; HU-11-03). Se diseña primero
 * para el teléfono: un indicador a la vez, un estudiante por fila y un botón grande por nivel.
 * La matriz completa queda en su propia pestaña. Cada cambio se guarda solo, en lotes.
 */
export function Valoracion({
  medicion,
  alGuardar,
}: {
  medicion: MedicionDetalle;
  /** Avisa que se guardó un lote: el consolidado se vuelve a calcular. */
  alGuardar?: () => void;
}) {
  const { niveles, cambiar, guardado, reintentar } = useValoraciones(
    medicion,
    alGuardar,
  );
  const [vista, setVista] = useState<number | typeof VISTA_MATRIZ>(
    medicion.indicadores[0]?.idIndicador ?? VISTA_MATRIZ,
  );
  const editable = medicion.puedeEditar;
  const escala = medicion.escala.niveles;
  const idPanel = useId();

  const sinValorar = useMemo(() => {
    const conteo = new Map<number, number>();
    for (const indicador of medicion.indicadores) {
      conteo.set(
        indicador.idIndicador,
        medicion.estudiantes.filter(
          (estudiante) =>
            !niveles.has(clave(estudiante.idMatricula, indicador.idIndicador)),
        ).length,
      );
    }
    return conteo;
  }, [medicion.indicadores, medicion.estudiantes, niveles]);

  const posicion = medicion.indicadores.findIndex(
    (fila) => fila.idIndicador === vista,
  );
  const indicador = medicion.indicadores[posicion];
  const siguiente = medicion.indicadores[posicion + 1] ?? null;
  const total = medicion.estudiantes.length;

  return (
    <section
      aria-labelledby="titulo-valoracion"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-2">
        <h2 id="titulo-valoracion" className="text-lg font-semibold">
          Valoración de los estudiantes
        </h2>
        <p className="text-sm text-slate-600">
          Nivel que alcanzó cada estudiante en cada indicador, con la escala del
          programa.
          {editable &&
            ' Toque un nivel para asignarlo y otra vez para quitarlo.'}
        </p>
        <ul aria-label="Escala del programa" className="flex flex-wrap gap-1.5">
          {escala.map((nivel) => (
            <li
              key={nivel.valor}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800"
            >
              {nivel.valor} · {nivel.etiqueta}
            </li>
          ))}
        </ul>
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-600">
          El curso no tiene estudiantes matriculados.
        </p>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Indicador que se valora"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
          >
            {medicion.indicadores.map((fila, i) => {
              const faltan = sinValorar.get(fila.idIndicador) ?? 0;
              const activo = vista === fila.idIndicador;
              return (
                <button
                  key={fila.idIndicador}
                  id={`${idPanel}-pestana-${fila.idIndicador}`}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  aria-controls={idPanel}
                  aria-label={`Indicador ${fila.numero ?? i + 1}: ${total - faltan} de ${total} valorados`}
                  onClick={(evento) => {
                    setVista(fila.idIndicador);
                    evento.currentTarget.scrollIntoView({
                      block: 'nearest',
                      inline: 'nearest',
                    });
                  }}
                  className={`flex min-h-11 shrink-0 flex-col items-center justify-center rounded-lg border px-3 py-1 text-sm font-semibold ${
                    activo
                      ? 'border-marca bg-marca text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span>Indicador {fila.numero ?? i + 1}</span>
                  <span
                    className={`text-xs font-medium ${activo ? 'text-white/90' : faltan > 0 ? 'text-amber-800' : 'text-slate-600'}`}
                  >
                    {total - faltan}/{total}
                  </span>
                </button>
              );
            })}
            <button
              id={`${idPanel}-pestana-${VISTA_MATRIZ}`}
              type="button"
              role="tab"
              aria-selected={vista === VISTA_MATRIZ}
              aria-controls={idPanel}
              onClick={(evento) => {
                setVista(VISTA_MATRIZ);
                evento.currentTarget.scrollIntoView({
                  block: 'nearest',
                  inline: 'nearest',
                });
              }}
              className={`min-h-11 shrink-0 rounded-lg border px-3 py-1 text-sm font-semibold ${
                vista === VISTA_MATRIZ
                  ? 'border-marca bg-marca text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              Matriz
            </button>
          </div>

          <div id={idPanel} role="tabpanel">
            {indicador ? (
              <PanelIndicador
                indicador={indicador}
                estudiantes={medicion.estudiantes}
                escala={escala}
                niveles={niveles}
                faltan={sinValorar.get(indicador.idIndicador) ?? 0}
                editable={editable}
                cambiar={cambiar}
                siguiente={siguiente}
                irA={(destino) => {
                  setVista(destino);
                  document
                    .getElementById('titulo-valoracion')
                    ?.scrollIntoView({ block: 'start' });
                  document
                    .getElementById(`${idPanel}-pestana-${destino}`)
                    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }}
              />
            ) : (
              <Matriz
                medicion={medicion}
                niveles={niveles}
                sinValorar={sinValorar}
                editable={editable}
                cambiar={cambiar}
              />
            )}
          </div>
        </>
      )}

      {editable && (
        <BarraGuardado guardado={guardado} reintentar={reintentar} />
      )}
    </section>
  );
}

function PanelIndicador({
  indicador,
  estudiantes,
  escala,
  niveles,
  faltan,
  editable,
  cambiar,
  siguiente,
  irA,
}: {
  indicador: IndicadorMedicion;
  estudiantes: EstudianteMedicion[];
  escala: NivelEscala[];
  niveles: ReadonlyMap<string, number>;
  faltan: number;
  editable: boolean;
  cambiar: Cambiar;
  siguiente: IndicadorMedicion | null;
  irA: (idIndicador: number | typeof VISTA_MATRIZ) => void;
}) {
  return (
    <div className="space-y-3">
      {indicador.descripcion && (
        <p className="font-medium">{indicador.descripcion}</p>
      )}
      {indicador.descriptores.length > 0 && (
        <details className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold text-marca">
            Ver la rúbrica de este indicador
          </summary>
          <dl className="mt-2 space-y-2">
            {indicador.descriptores.map((descriptor) => (
              <div key={descriptor.valor}>
                <dt className="font-semibold">
                  {descriptor.valor} ·{' '}
                  {escala.find((nivel) => nivel.valor === descriptor.valor)
                    ?.etiqueta ?? ''}
                </dt>
                <dd className="text-slate-700">{descriptor.descripcion}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {faltan > 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <strong>
            {faltan} {faltan === 1 ? 'estudiante' : 'estudiantes'} sin valorar
          </strong>{' '}
          en este indicador: quedan fuera de la muestra hasta que les asigne un
          nivel.
        </p>
      ) : (
        <p className="text-sm font-medium text-emerald-800">
          Todos los estudiantes están valorados en este indicador.
        </p>
      )}
      <ul className="divide-y divide-slate-100">
        {estudiantes.map((estudiante) => (
          <FilaEstudiante
            key={estudiante.idMatricula}
            estudiante={estudiante}
            idIndicador={indicador.idIndicador}
            valor={
              niveles.get(
                clave(estudiante.idMatricula, indicador.idIndicador),
              ) ?? null
            }
            escala={escala}
            editable={editable}
            cambiar={cambiar}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={() => irA(siguiente?.idIndicador ?? VISTA_MATRIZ)}
        className="w-full rounded-lg border border-marca px-4 py-3 font-semibold text-marca hover:bg-marca/5 sm:w-auto"
      >
        {siguiente
          ? `Continuar con el indicador ${siguiente.numero ?? ''} →`
          : 'Revisar la matriz completa →'}
      </button>
    </div>
  );
}

const FilaEstudiante = memo(function FilaEstudiante({
  estudiante,
  idIndicador,
  valor,
  escala,
  editable,
  cambiar,
}: {
  estudiante: EstudianteMedicion;
  idIndicador: number;
  valor: number | null;
  escala: NivelEscala[];
  editable: boolean;
  cambiar: Cambiar;
}) {
  const nombre = `${estudiante.apellidos}, ${estudiante.nombres}`;
  const etiqueta = escala.find((nivel) => nivel.valor === valor)?.etiqueta;
  return (
    <li
      className={`py-3 sm:flex sm:items-center sm:gap-3 ${valor === null ? 'border-l-4 border-amber-400 pl-2' : 'pl-3'}`}
    >
      <div className="min-w-0 sm:flex-1">
        <p className="leading-tight font-medium break-words">{nombre}</p>
        <p
          className={`text-xs ${valor === null ? 'font-semibold text-amber-800' : 'text-slate-600'}`}
        >
          {valor === null ? 'Sin valorar' : etiqueta}
          {estudiante.retirado && ' · Retirado del curso'}
        </p>
      </div>
      <div
        role="group"
        aria-label={`Nivel de ${nombre}`}
        className="mt-2 grid grid-cols-4 gap-1.5 sm:mt-0 sm:flex sm:shrink-0 sm:gap-1"
      >
        {escala.map((nivel) => {
          const elegido = valor === nivel.valor;
          return (
            <button
              key={nivel.valor}
              type="button"
              aria-pressed={elegido}
              aria-label={`${nivel.valor}, ${nivel.etiqueta}`}
              title={nivel.etiqueta}
              disabled={!editable}
              onClick={() =>
                cambiar(
                  estudiante.idMatricula,
                  idIndicador,
                  elegido ? null : nivel.valor,
                )
              }
              className={`flex min-h-12 flex-col items-center justify-center rounded-lg border px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca sm:size-11 sm:min-h-0 ${
                elegido
                  ? 'border-marca bg-marca text-white'
                  : 'border-slate-300 bg-white text-slate-700 enabled:hover:bg-slate-50 disabled:text-slate-400'
              }`}
            >
              <span className="text-base leading-none font-bold">
                {nivel.valor}
              </span>
              {/* En el teléfono, la etiqueta debajo del número: no hay que memorizar la escala. */}
              <span
                aria-hidden="true"
                className="mt-0.5 text-[11px] leading-tight sm:hidden"
              >
                {nivel.etiqueta}
              </span>
            </button>
          );
        })}
      </div>
    </li>
  );
});

/** Matriz estudiantes × indicadores, como la hoja del formato. Cómoda en pantalla ancha. */
function Matriz({
  medicion,
  niveles,
  sinValorar,
  editable,
  cambiar,
}: {
  medicion: MedicionDetalle;
  niveles: ReadonlyMap<string, number>;
  sinValorar: ReadonlyMap<number, number>;
  editable: boolean;
  cambiar: Cambiar;
}) {
  const escala = medicion.escala.niveles;
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <caption className="sr-only">
          Nivel de cada estudiante en cada indicador
        </caption>
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold"
            >
              Estudiante
            </th>
            {medicion.indicadores.map((indicador, i) => (
              <th
                key={indicador.idIndicador}
                scope="col"
                className="px-2 py-2 text-center font-semibold whitespace-nowrap"
              >
                Ind. {indicador.numero ?? i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {medicion.estudiantes.map((estudiante) => {
            const nombre = `${estudiante.apellidos}, ${estudiante.nombres}`;
            return (
              <tr key={estudiante.idMatricula}>
                <th
                  scope="row"
                  className="sticky left-0 bg-white px-3 py-1.5 text-left font-medium"
                >
                  <span className="block min-w-36">{nombre}</span>
                  {estudiante.retirado && (
                    <span className="block text-xs font-normal text-slate-600">
                      Retirado del curso
                    </span>
                  )}
                </th>
                {medicion.indicadores.map((indicador, i) => {
                  const valor =
                    niveles.get(
                      clave(estudiante.idMatricula, indicador.idIndicador),
                    ) ?? null;
                  return (
                    <td
                      key={indicador.idIndicador}
                      className="px-2 py-1.5 text-center"
                    >
                      <select
                        aria-label={`Nivel de ${nombre} en el indicador ${indicador.numero ?? i + 1}`}
                        value={valor ?? ''}
                        disabled={!editable}
                        onChange={(evento) =>
                          cambiar(
                            estudiante.idMatricula,
                            indicador.idIndicador,
                            evento.target.value === ''
                              ? null
                              : Number(evento.target.value),
                          )
                        }
                        className={`min-h-10 rounded-md border px-1.5 ${valor === null ? 'border-amber-400 bg-amber-50' : 'border-slate-300 bg-white'}`}
                      >
                        <option value="">—</option>
                        {escala.map((nivel) => (
                          <option key={nivel.valor} value={nivel.valor}>
                            {nivel.valor} · {nivel.etiqueta}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-50">
          <tr>
            <th
              scope="row"
              className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold"
            >
              Sin valorar
            </th>
            {medicion.indicadores.map((indicador) => (
              <td
                key={indicador.idIndicador}
                className="px-2 py-2 text-center font-semibold"
              >
                {sinValorar.get(indicador.idIndicador) ?? 0}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BarraGuardado({
  guardado,
  reintentar,
}: {
  guardado: EstadoGuardado;
  reintentar: () => void;
}) {
  const fallido = guardado.estado === 'fallido';
  return (
    <div
      role="status"
      className={`sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm sm:-mx-6 sm:px-6 ${
        fallido
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-slate-200 bg-white/95 text-slate-700'
      }`}
    >
      <span>
        {
          {
            'al-dia': 'Los cambios se guardan solos.',
            pendiente: 'Cambios por guardar…',
            guardando: 'Guardando…',
            guardado: 'Cambios guardados.',
            fallido: fallido ? guardado.mensaje : '',
          }[guardado.estado]
        }
        {fallido &&
          !guardado.reintentable &&
          ' Recargue la página para ver lo que quedó guardado.'}
      </span>
      {fallido && guardado.reintentable && (
        <button
          type="button"
          onClick={reintentar}
          className="rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold text-red-800 hover:bg-red-100"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

type Cambiar = (
  idMatricula: number,
  idIndicador: number,
  valor: number | null,
) => void;

/**
 * Niveles de la hoja y su guardado automático. Los cambios se acumulan y se envían juntos
 * poco después del último toque; si falla, quedan pendientes para el siguiente intento. Un
 * cambio hecho mientras se guarda espera al siguiente lote.
 */
function useValoraciones(medicion: MedicionDetalle, alGuardar?: () => void) {
  const [niveles, setNiveles] = useState<ReadonlyMap<string, number>>(
    () =>
      new Map(
        medicion.estudiantes.flatMap((estudiante) =>
          estudiante.valoraciones.map(
            (valoracion) =>
              [
                clave(estudiante.idMatricula, valoracion.idIndicador),
                valoracion.valor,
              ] as const,
          ),
        ),
      ),
  );
  const [guardado, setGuardado] = useState<EstadoGuardado>({
    estado: 'al-dia',
  });
  const pendientes = useRef(new Map<string, CeldaValoracion>());
  const enCurso = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardarRef = useRef<() => Promise<void>>(async () => {});
  const alGuardarRef = useRef(alGuardar);
  useEffect(() => {
    alGuardarRef.current = alGuardar;
  }, [alGuardar]);
  const idMedicion = medicion.id;

  const programar = useCallback(() => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
    }
    temporizador.current = setTimeout(() => {
      void guardarRef.current();
    }, ESPERA_GUARDADO_MS);
  }, []);

  const guardar = useCallback(async () => {
    if (enCurso.current || pendientes.current.size === 0) {
      return;
    }
    const lote = new Map(pendientes.current);
    enCurso.current = true;
    setGuardado({ estado: 'guardando' });
    try {
      await registrarValoraciones(idMedicion, [...lote.values()]);
      // Solo se descarta lo enviado que no volvió a cambiar mientras se guardaba.
      for (const [celda, valoracion] of lote) {
        if (pendientes.current.get(celda) === valoracion) {
          pendientes.current.delete(celda);
        }
      }
      enCurso.current = false;
      alGuardarRef.current?.();
      if (pendientes.current.size > 0) {
        setGuardado({ estado: 'pendiente' });
        programar();
      } else {
        setGuardado({ estado: 'guardado' });
      }
    } catch (error) {
      enCurso.current = false;
      setGuardado({
        estado: 'fallido',
        mensaje: mensajeParaUsuario(error),
        // Un 4xx (medición cerrada, dato inválido) no se arregla reintentando.
        reintentable: !(
          error instanceof ErrorApi &&
          error.estado !== undefined &&
          error.estado < 500
        ),
      });
    }
  }, [idMedicion, programar]);

  useEffect(() => {
    guardarRef.current = guardar;
  }, [guardar]);

  // Al salir con cambios sin guardar: el navegador pregunta, y al cambiar de pantalla dentro
  // de URAP se envían de una vez.
  useEffect(() => {
    const avisar = (evento: BeforeUnloadEvent) => {
      if (pendientes.current.size > 0 || enCurso.current) {
        evento.preventDefault();
      }
    };
    window.addEventListener('beforeunload', avisar);
    return () => {
      window.removeEventListener('beforeunload', avisar);
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
      void guardarRef.current();
    };
  }, []);

  const cambiar = useCallback<Cambiar>(
    (idMatricula, idIndicador, valor) => {
      const celda = clave(idMatricula, idIndicador);
      setNiveles((actuales) => {
        const nuevos = new Map(actuales);
        if (valor === null) {
          nuevos.delete(celda);
        } else {
          nuevos.set(celda, valor);
        }
        return nuevos;
      });
      pendientes.current.set(celda, { idMatricula, idIndicador, valor });
      setGuardado({ estado: 'pendiente' });
      programar();
    },
    [programar],
  );

  const reintentar = useCallback(() => {
    void guardarRef.current();
  }, []);

  return { niveles, cambiar, guardado, reintentar };
}
