'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import { consultarProyectoDocente } from '@/api/proyectos-docentes';
import {
  type BloqueHorario,
  type CalendarioSesiones,
  consultarCalendario,
  consultarHorario,
  DIAS_SEMANA,
  generarCalendario,
  guardarHorario,
  nombreDia,
  type ResultadoGeneracion,
  type SesionCalendario,
  textoAtraso,
  textoRestante,
} from '@/api/sesiones';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';

interface Fallo {
  mensaje: string;
  detalles?: string[];
}

function falloDe(error: unknown): Fallo {
  return {
    mensaje: mensajeParaUsuario(error),
    detalles: error instanceof ErrorApi ? error.detalles : undefined,
  };
}

/** Las fechas llegan como `YYYY-MM-DD`: se leen en UTC para que no cambien de día. */
const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const formatoFechaCorta = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

function fechaLarga(fecha: string): string {
  return formatoFecha.format(new Date(`${fecha}T00:00:00Z`));
}

function fechaCorta(fecha: string): string {
  return formatoFechaCorta.format(new Date(`${fecha}T00:00:00Z`));
}

/**
 * Calendario de sesiones del curso (RF-19). El docente define los días y horas de clase
 * (HU-08-02) y genera el calendario (HU-08-03). Las sesiones vencidas sin diligenciar salen en
 * rojo con sus días de atraso y las por vencer en color de advertencia (RF-23): el backend
 * decide cuáles son y con qué umbral. Se diseña primero para el teléfono: el docente lo
 * consulta al salir del salón.
 */
export function CalendarioSesionesCurso() {
  const { id } = useParams<{ id: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;
  // Cambia después de guardar o generar, para volver a cargar del servidor.
  const [version, setVersion] = useState(0);
  const clave = idProyecto === null ? null : `${idProyecto}-${version}`;

  const proyecto = useConsulta(
    idProyecto === null ? null : `proyecto-${idProyecto}`,
    (senal) => consultarProyectoDocente(idProyecto!, senal),
  );
  const horario = useConsulta(clave && `horario-${clave}`, (senal) =>
    consultarHorario(idProyecto!, senal),
  );
  const calendario = useConsulta(clave && `calendario-${clave}`, (senal) =>
    consultarCalendario(idProyecto!, senal),
  );

  const [editando, setEditando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [resultado, setResultado] = useState<ResultadoGeneracion | null>(null);
  const [horarioGuardado, setHorarioGuardado] = useState(false);

  async function generar() {
    if (idProyecto === null) {
      return;
    }
    setGenerando(true);
    setFallo(null);
    setResultado(null);
    try {
      setResultado(await generarCalendario(idProyecto));
      setHorarioGuardado(false);
      setVersion((valor) => valor + 1);
    } catch (error) {
      setFallo(falloDe(error));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <section className="space-y-5">
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

      <div className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Calendario de sesiones
        </h1>
        {proyecto.estado === 'lista' && (
          <p className="text-slate-700">{proyecto.datos.asignatura}</p>
        )}
      </div>

      {idProyecto === null && (
        <AvisoError mensaje="El proyecto docente no existe o no tiene acceso a él." />
      )}
      {(horario.estado === 'cargando' || calendario.estado === 'cargando') && (
        <Cargando />
      )}
      {horario.estado === 'fallida' && (
        <AvisoError
          mensaje={horario.mensaje}
          reintentar={horario.reintentable ? horario.reintentar : undefined}
        />
      )}
      {horario.estado === 'lista' && calendario.estado === 'fallida' && (
        <AvisoError
          mensaje={calendario.mensaje}
          reintentar={
            calendario.reintentable ? calendario.reintentar : undefined
          }
        />
      )}

      {horario.estado === 'lista' && calendario.estado === 'lista' && (
        <>
          <section
            aria-labelledby="titulo-horario"
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="titulo-horario" className="text-lg font-semibold">
                Días y horas de clase
              </h2>
              {horario.datos.puedeEditar && !editando && (
                <button
                  type="button"
                  onClick={() => {
                    setEditando(true);
                    setFallo(null);
                    setHorarioGuardado(false);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  {horario.datos.bloques.length === 0
                    ? 'Definir horario'
                    : 'Cambiar horario'}
                </button>
              )}
            </div>

            {editando ? (
              <EditorHorario
                inicial={horario.datos.bloques}
                alCancelar={() => {
                  setEditando(false);
                  setFallo(null);
                }}
                alGuardar={async (bloques) => {
                  setFallo(null);
                  try {
                    await guardarHorario(idProyecto!, { bloques });
                    setEditando(false);
                    setHorarioGuardado(true);
                    setResultado(null);
                    setVersion((valor) => valor + 1);
                  } catch (error) {
                    setFallo(falloDe(error));
                  }
                }}
              />
            ) : horario.datos.bloques.length === 0 ? (
              <p className="text-sm text-slate-600">
                {horario.datos.puedeEditar
                  ? 'Defina los días y las horas de clase para generar el calendario.'
                  : 'El docente todavía no ha definido el horario del curso.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {horario.datos.bloques.map((bloque) => (
                  <li
                    key={bloque.diaSemana}
                    className="flex justify-between gap-3"
                  >
                    <span className="font-medium">
                      {nombreDia(bloque.diaSemana)}
                    </span>
                    <span className="tabular-nums text-slate-700">
                      {bloque.horaInicio} – {bloque.horaFin}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {fallo && editando && (
              <AvisoError mensaje={fallo.mensaje} detalles={fallo.detalles} />
            )}
          </section>

          <Generacion
            calendario={calendario.datos}
            hayHorario={horario.datos.bloques.length > 0}
            puedeEditar={horario.datos.puedeEditar && !editando}
            horarioGuardado={horarioGuardado}
            generando={generando}
            alGenerar={generar}
          />
          {fallo && !editando && (
            <AvisoError mensaje={fallo.mensaje} detalles={fallo.detalles} />
          )}
          <ResumenAlertasCalendario calendario={calendario.datos} />
          {resultado && <ResumenGeneracion resultado={resultado} />}
          {!resultado &&
            calendario.datos.advertencias.map((advertencia) => (
              <Advertencia key={advertencia} titulo={advertencia} />
            ))}

          <ListaSesiones calendario={calendario.datos} />
        </>
      )}
    </section>
  );
}

interface FilaHorario {
  activo: boolean;
  horaInicio: string;
  horaFin: string;
}

function EditorHorario({
  inicial,
  alGuardar,
  alCancelar,
}: {
  inicial: BloqueHorario[];
  alGuardar: (bloques: BloqueHorario[]) => Promise<void>;
  alCancelar: () => void;
}) {
  const [filas, setFilas] = useState<Record<number, FilaHorario>>(() =>
    Object.fromEntries(
      DIAS_SEMANA.map(({ valor }) => {
        const bloque = inicial.find((fila) => fila.diaSemana === valor);
        return [
          valor,
          {
            activo: Boolean(bloque),
            horaInicio: bloque?.horaInicio ?? '07:00',
            horaFin: bloque?.horaFin ?? '09:00',
          },
        ];
      }),
    ),
  );
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  function cambiar(dia: number, cambios: Partial<FilaHorario>) {
    setFilas((actuales) => ({
      ...actuales,
      [dia]: { ...actuales[dia], ...cambios },
    }));
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const bloques = DIAS_SEMANA.filter(({ valor }) => filas[valor].activo).map(
      ({ valor }) => ({
        diaSemana: valor,
        horaInicio: filas[valor].horaInicio,
        horaFin: filas[valor].horaFin,
      }),
    );
    // Se repite aquí para avisar sin esperar al servidor; el backend valida lo mismo.
    if (bloques.length === 0) {
      setAviso('Marque al menos un día de clase.');
      return;
    }
    const invertido = bloques.find(
      (bloque) =>
        !bloque.horaInicio ||
        !bloque.horaFin ||
        bloque.horaInicio >= bloque.horaFin,
    );
    if (invertido) {
      setAviso(
        `Revise el ${nombreDia(invertido.diaSemana).toLowerCase()}: la hora de fin debe ser posterior a la de inicio.`,
      );
      return;
    }
    setAviso(null);
    setGuardando(true);
    try {
      await alGuardar(bloques);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-3" noValidate>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-slate-600">
          Marque los días de clase y la hora en que empieza y termina cada uno.
        </legend>
        {DIAS_SEMANA.map(({ valor, nombre }) => {
          const fila = filas[valor];
          return (
            <div
              key={valor}
              className={`rounded-xl border p-3 ${fila.activo ? 'border-marca/40 bg-marca/5' : 'border-slate-200'}`}
            >
              <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
                <input
                  type="checkbox"
                  checked={fila.activo}
                  onChange={(evento) =>
                    cambiar(valor, { activo: evento.target.checked })
                  }
                  className="size-5 accent-marca"
                />
                {nombre}
              </label>
              {fila.activo && (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-sm">
                    <span className="block text-slate-600">Desde</span>
                    <input
                      type="time"
                      required
                      value={fila.horaInicio}
                      onChange={(evento) =>
                        cambiar(valor, { horaInicio: evento.target.value })
                      }
                      className="min-h-11 w-full rounded-lg border border-slate-300 px-2 text-base tabular-nums"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="block text-slate-600">Hasta</span>
                    <input
                      type="time"
                      required
                      value={fila.horaFin}
                      onChange={(evento) =>
                        cambiar(valor, { horaFin: evento.target.value })
                      }
                      className="min-h-11 w-full rounded-lg border border-slate-300 px-2 text-base tabular-nums"
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </fieldset>
      {aviso && <AvisoError mensaje={aviso} />}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={alCancelar}
          disabled={guardando}
          className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold hover:bg-slate-50 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="min-h-11 rounded-lg bg-marca px-4 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar horario'}
        </button>
      </div>
    </form>
  );
}

function Generacion({
  calendario,
  hayHorario,
  puedeEditar,
  horarioGuardado,
  generando,
  alGenerar,
}: {
  calendario: CalendarioSesiones;
  hayHorario: boolean;
  puedeEditar: boolean;
  horarioGuardado: boolean;
  generando: boolean;
  alGenerar: () => void;
}) {
  const { periodo } = calendario;
  const existe = calendario.total > 0;
  return (
    <section
      aria-labelledby="titulo-periodo"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="titulo-periodo" className="text-lg font-semibold">
        Período {periodo.codigo ?? ''}
      </h2>
      <p className="text-sm text-slate-700">
        {periodo.fechaInicio && periodo.fechaFin
          ? `Del ${fechaLarga(periodo.fechaInicio)} al ${fechaLarga(periodo.fechaFin)}`
          : 'El período todavía no tiene fechas de inicio y de finalización.'}
        {periodo.numeroSemanas ? ` · ${periodo.numeroSemanas} semanas` : ''}
      </p>
      {periodo.cerrado && (
        <Insignia>Período cerrado: el calendario ya no se modifica</Insignia>
      )}
      {horarioGuardado && existe && (
        <Advertencia titulo="Horario guardado">
          <p>Recalcule el calendario para aplicar el nuevo horario.</p>
        </Advertencia>
      )}
      {puedeEditar && hayHorario && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={alGenerar}
            disabled={generando}
            className="min-h-11 w-full rounded-lg bg-marca px-4 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60 sm:w-auto"
          >
            {generando
              ? 'Generando…'
              : existe
                ? 'Recalcular calendario'
                : 'Generar calendario'}
          </button>
          <p className="text-sm text-slate-600">
            {existe
              ? 'Se recalculan solo las sesiones que no ha diligenciado; las diligenciadas no cambian.'
              : 'El sistema crea una sesión por cada día de clase del período y marca los festivos.'}
          </p>
        </div>
      )}
    </section>
  );
}

function cantidad(numero: number, singular: string, plural: string): string {
  return `${numero} ${numero === 1 ? singular : plural}`;
}

function ResumenGeneracion({ resultado }: { resultado: ResultadoGeneracion }) {
  const partes = [
    resultado.creadas > 0 &&
      cantidad(resultado.creadas, 'sesión nueva', 'sesiones nuevas'),
    resultado.actualizadas > 0 &&
      cantidad(resultado.actualizadas, 'actualizada', 'actualizadas'),
    resultado.retiradas > 0 &&
      `${cantidad(resultado.retiradas, 'retirada', 'retiradas')} porque ya no caen en el horario`,
    resultado.conservadas > 0 &&
      `${cantidad(resultado.conservadas, 'diligenciada', 'diligenciadas')} sin cambios`,
  ].filter(Boolean);
  return (
    <div className="space-y-2">
      <div
        role="status"
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-950"
      >
        <p className="font-semibold">
          Calendario listo: {resultado.total} sesiones, {resultado.festivos}{' '}
          {resultado.festivos === 1 ? 'festivo' : 'festivos'}.
        </p>
        {partes.length > 0 && <p>{partes.join(' · ')}.</p>}
      </div>
      {resultado.advertencias.map((advertencia) => (
        <Advertencia key={advertencia} titulo={advertencia} />
      ))}
    </div>
  );
}

function ListaSesiones({ calendario }: { calendario: CalendarioSesiones }) {
  if (calendario.total === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        Todavía no hay sesiones en el calendario.
      </p>
    );
  }
  const fechaHoy = calendario.hoy;
  const semanas = new Map<number, SesionCalendario[]>();
  for (const sesion of calendario.elementos) {
    semanas.set(sesion.semana, [...(semanas.get(sesion.semana) ?? []), sesion]);
  }
  const proxima = calendario.elementos.find(
    (sesion) => sesion.fecha >= fechaHoy,
  );

  return (
    <section aria-labelledby="titulo-sesiones" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-sesiones" className="text-lg font-semibold">
          Sesiones ({calendario.total})
        </h2>
        {proxima && (
          <a
            href={`#semana-${proxima.semana}`}
            className="text-sm font-medium text-marca hover:underline"
          >
            Ir a la semana {proxima.semana}
          </a>
        )}
      </div>
      {[...semanas].map(([semana, sesiones]) => (
        <section
          key={semana}
          id={`semana-${semana}`}
          aria-labelledby={`titulo-semana-${semana}`}
          className="scroll-mt-4 space-y-2"
        >
          <h3
            id={`titulo-semana-${semana}`}
            className="text-sm font-semibold uppercase tracking-wide text-slate-600"
          >
            Semana {semana}
            <span className="font-normal normal-case tracking-normal">
              {' '}
              · {fechaCorta(sesiones[0].fecha)}
              {sesiones.length > 1 &&
                ` – ${fechaCorta(sesiones.at(-1)!.fecha)}`}
            </span>
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {sesiones.map((sesion) => (
              <TarjetaSesion
                key={sesion.id}
                sesion={sesion}
                esHoy={sesion.fecha === fechaHoy}
              />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

/** Estilo de la tarjeta según la alerta del backend (RF-23) o, sin alerta, el tipo y el día. */
function estiloTarjeta(sesion: SesionCalendario, esHoy: boolean): string {
  if (sesion.alerta === 'vencida' || sesion.alerta === 'incumplida') {
    return 'border-red-300 bg-red-50';
  }
  if (sesion.alerta === 'por_vencer') {
    return 'border-amber-300 bg-amber-50';
  }
  if (sesion.tipo?.codigo === 'festivo') {
    return 'border-sky-200 bg-sky-50';
  }
  return esHoy ? 'border-marca bg-marca/5' : 'border-slate-200 bg-white';
}

function TarjetaSesion({
  sesion,
  esHoy,
}: {
  sesion: SesionCalendario;
  esHoy: boolean;
}) {
  const esFestivo = sesion.tipo?.codigo === 'festivo';
  return (
    <li
      id={`sesion-${sesion.id}`}
      className={`scroll-mt-4 rounded-xl border p-3 ${estiloTarjeta(sesion, esHoy)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold first-letter:uppercase">
          {fechaLarga(sesion.fecha)}
        </p>
        {sesion.horaInicio && sesion.horaFin && (
          <span className="shrink-0 text-sm tabular-nums text-slate-700">
            {sesion.horaInicio} – {sesion.horaFin}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {sesion.alerta === 'vencida' && (
          <Insignia tono="peligro">
            Vencida
            {sesion.diasAtraso ? ` · ${textoAtraso(sesion.diasAtraso)}` : ''}
          </Insignia>
        )}
        {sesion.alerta === 'incumplida' && (
          <Insignia tono="peligro">
            Incumplida
            {sesion.diasAtraso ? ` · ${textoAtraso(sesion.diasAtraso)}` : ''}
          </Insignia>
        )}
        {sesion.alerta === 'por_vencer' && sesion.diasRestantes !== null && (
          <Insignia tono="advertencia">
            Por vencer · {textoRestante(sesion.diasRestantes)}
          </Insignia>
        )}
        {esHoy && <Insignia tono="marca">Hoy</Insignia>}
        {sesion.festivo && (
          <Insignia tono="informativo">Festivo · {sesion.festivo}</Insignia>
        )}
        {sesion.tipo && !esFestivo && sesion.tipo.codigo !== 'clase' && (
          <Insignia>{sesion.tipo.nombre}</Insignia>
        )}
        {sesion.diligenciada && <Insignia>Diligenciada</Insignia>}
      </div>
    </li>
  );
}

/**
 * RF-23: cuántas sesiones vencidas y por vencer tiene el calendario completo, con un enlace a
 * la vencida más antigua. El umbral lo da el backend (parámetro del sistema).
 */
function ResumenAlertasCalendario({
  calendario,
}: {
  calendario: CalendarioSesiones;
}) {
  const { resumen, umbralDias, total } = calendario;
  if (total === 0) {
    return null;
  }
  const primeraVencida = calendario.elementos.find(
    (sesion) => sesion.alerta === 'vencida' || sesion.alerta === 'incumplida',
  );
  const pendientes = resumen.vencidas + resumen.porVencer + resumen.incumplidas;

  return (
    <section
      aria-labelledby="titulo-alertas"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="titulo-alertas" className="text-lg font-semibold">
        Sesiones por diligenciar
      </h2>
      {pendientes === 0 ? (
        <p className="text-sm text-slate-700">
          Al día: no hay sesiones vencidas ni por vencer.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {resumen.vencidas > 0 && (
            <li className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
              <span className="block text-2xl font-bold tabular-nums">
                {resumen.vencidas}
              </span>
              <span className="text-sm font-medium">
                {resumen.vencidas === 1 ? 'vencida' : 'vencidas'}
              </span>
            </li>
          )}
          {resumen.porVencer > 0 && (
            <li className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              <span className="block text-2xl font-bold tabular-nums">
                {resumen.porVencer}
              </span>
              <span className="text-sm font-medium">por vencer</span>
            </li>
          )}
          {resumen.incumplidas > 0 && (
            <li className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
              <span className="block text-2xl font-bold tabular-nums">
                {resumen.incumplidas}
              </span>
              <span className="text-sm font-medium">
                {resumen.incumplidas === 1 ? 'incumplida' : 'incumplidas'}
              </span>
            </li>
          )}
        </ul>
      )}
      {resumen.incumplidas > 0 && (
        <p className="text-sm text-slate-700">
          El período está cerrado: las sesiones vencidas quedan como incumplidas
          y ya no suman días de atraso.
        </p>
      )}
      {resumen.mayorAtraso !== null && (
        <p className="text-sm text-slate-700">
          La más antigua lleva {textoAtraso(resumen.mayorAtraso)}.
        </p>
      )}
      {umbralDias !== null && !calendario.periodo.cerrado && (
        <p className="text-sm text-slate-600">
          «Por vencer» son las de hoy
          {umbralDias > 0
            ? ` y las de los próximos ${umbralDias === 1 ? 'día' : `${umbralDias} días`}`
            : ''}
          .
        </p>
      )}
      {primeraVencida && (
        <a
          href={`#sesion-${primeraVencida.id}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-red-800 hover:underline"
        >
          {primeraVencida.alerta === 'incumplida'
            ? 'Ir a la incumplida más antigua'
            : 'Ir a la vencida más antigua'}
        </a>
      )}
    </section>
  );
}
