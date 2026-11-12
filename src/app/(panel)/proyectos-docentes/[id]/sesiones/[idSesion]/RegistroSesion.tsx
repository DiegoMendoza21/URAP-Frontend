'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  consultarSesion,
  type DetalleSesion,
  type EstudianteSesion,
  registrarSesion,
  type TemaContenido,
} from '@/api/sesiones';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../../_componentes/Estados';
import { fechaLarga, momento } from '../../../_componentes/fechas';
import {
  InsigniasSesion,
  resumenRegistro,
} from '../../../_componentes/InsigniasSesion';
import { useConsulta } from '../../../_componentes/useConsulta';

/** El mismo tope que valida el backend; aquí solo sirve para contar caracteres al escribir. */
const OBSERVACIONES_MAXIMO = 2000;
/** HU-08-05: los mismos topes que valida el backend para los temas no planeados. */
const TEMA_ADICIONAL_MAXIMO = 200;
const TEMAS_ADICIONALES_MAXIMO = 10;
const MENSAJE_SIN_TEMAS =
  'Seleccione al menos un tema del contenido programático o escriba un tema no planeado.';

/** Para comparar temas como los lee una persona: sin mayúsculas, tildes ni espacios de más. */
function huellaTema(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-CO')
    .normalize('NFD')
    .replace(/[́̈]/g, '')
    .normalize('NFC');
}

const limpiarTema = (texto: string) => texto.trim().replace(/\s+/g, ' ');

interface Fallo {
  mensaje: string;
  detalles?: string[];
}

function nombreEstudiante(estudiante: EstudianteSesion): string {
  return (
    [estudiante.apellidos, estudiante.nombres].filter(Boolean).join(', ') ||
    'Sin nombre'
  );
}

/**
 * Registro de la clase de una sesión (RF-20, HU-08-04) con los estudiantes que no asistieron
 * (RF-22, HU-09-02). Se diseña primero para el teléfono: el docente la diligencia al salir del
 * salón. Quién puede registrar, qué fecha ya se puede registrar y qué datos personales se ven
 * lo decide el backend; aquí solo se muestra.
 */
export function RegistroSesion() {
  const { id, idSesion } = useParams<{ id: string; idSesion: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;
  const idDeSesion = /^\d+$/.test(idSesion) ? Number(idSesion) : null;
  // Cambia después de guardar, para volver a cargar del servidor.
  const [version, setVersion] = useState(0);
  const [guardado, setGuardado] = useState<string | null>(null);
  const valido = idProyecto !== null && idDeSesion !== null;
  const detalle = useConsulta(
    valido ? `sesion-${idProyecto}-${idDeSesion}-${version}` : null,
    (senal) => consultarSesion(idProyecto!, idDeSesion!, senal),
  );
  const calendario =
    idProyecto === null
      ? '/proyectos-docentes'
      : `/proyectos-docentes/${idProyecto}/calendario${idDeSesion === null ? '' : `#sesion-${idDeSesion}`}`;

  return (
    <section className="space-y-5">
      <Link
        href={calendario}
        className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
      >
        ← Calendario de sesiones
      </Link>

      {!valido && (
        <AvisoError mensaje="La sesión no existe o no tiene acceso a ella." />
      )}
      {detalle.estado === 'cargando' && <Cargando />}
      {detalle.estado === 'fallida' && (
        <AvisoError
          mensaje={detalle.mensaje}
          reintentar={detalle.reintentable ? detalle.reintentar : undefined}
        />
      )}
      {detalle.estado === 'lista' && (
        <>
          <Encabezado detalle={detalle.datos} />
          {guardado && (
            <div
              role="status"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-950"
            >
              <p className="font-semibold">{guardado}</p>
              <Link
                href={calendario}
                className="mt-1 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline"
              >
                Volver al calendario
              </Link>
            </div>
          )}
          {detalle.datos.puedeRegistrar ? (
            <FormularioRegistro
              key={version}
              detalle={detalle.datos}
              idProyecto={idProyecto!}
              alGuardar={(nuevo) => {
                setGuardado(
                  `Clase registrada: ${resumenRegistro(nuevo.sesion)}.`,
                );
                setVersion((valor) => valor + 1);
              }}
            />
          ) : detalle.datos.motivoNoRegistrable &&
            !detalle.datos.sesion.diligenciada ? null : (
            // Si todavía no se puede registrar (proyecto sin aprobar, sesión futura…) y no hay
            // nada registrado, basta el aviso del encabezado, en lugar del formulario.
            <ConsultaRegistro detalle={detalle.datos} />
          )}
        </>
      )}
    </section>
  );
}

function Encabezado({ detalle }: { detalle: DetalleSesion }) {
  const { sesion, registro } = detalle;
  return (
    <div className="space-y-2">
      {detalle.asignatura && (
        <p className="text-sm text-slate-600">{detalle.asignatura}</p>
      )}
      <h1 className="text-2xl font-bold first-letter:uppercase sm:text-3xl">
        {fechaLarga(sesion.fecha)}
      </h1>
      <p className="text-slate-700">
        Semana {sesion.semana}
        {sesion.horaInicio && sesion.horaFin
          ? ` · ${sesion.horaInicio} – ${sesion.horaFin}`
          : ''}
      </p>
      <InsigniasSesion sesion={sesion} esHoy={false} />
      {registro && (
        <p className="text-sm text-slate-600">
          Registrada el {momento(registro.fecha)}
          {registro.registradoPor
            ? ` por ${registro.registradoPor}`
            : ''} · {resumenRegistro(sesion)}
        </p>
      )}
      {detalle.motivoNoRegistrable && (
        <Advertencia titulo={detalle.motivoNoRegistrable} />
      )}
    </div>
  );
}

/** Lo registrado, para quien solo consulta o cuando ya no se puede registrar. */
function ConsultaRegistro({ detalle }: { detalle: DetalleSesion }) {
  const temas = detalle.temas.filter((tema) => tema.seleccionado);
  const ausentes =
    detalle.asistencia?.estudiantes.filter(
      (estudiante) => estudiante.ausente,
    ) ?? [];
  return (
    <div className="space-y-4">
      <section
        aria-labelledby="titulo-temas"
        className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 id="titulo-temas" className="text-lg font-semibold">
          Temas desarrollados
        </h2>
        {temas.length === 0 && detalle.temasAdicionales.length === 0 ? (
          <p className="text-sm text-slate-600">
            La clase todavía no está registrada.
          </p>
        ) : (
          <ul className="space-y-1">
            {temas.map((tema) => (
              <li key={tema.idContenido}>
                <span className="text-sm text-slate-600">
                  Semana {tema.semana} ·{' '}
                </span>
                {tema.tema}
              </li>
            ))}
            {detalle.temasAdicionales.map((tema) => (
              <li
                key={`adicional-${tema}`}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="break-words">{tema}</span>
                <Insignia tono="informativo">No planeado</Insignia>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section
        aria-labelledby="titulo-asistencia"
        className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 id="titulo-asistencia" className="text-lg font-semibold">
          Asistencia
        </h2>
        <p>
          {detalle.numeroAusentes === 0
            ? 'Sin ausentes registrados.'
            : `${detalle.numeroAusentes} ${detalle.numeroAusentes === 1 ? 'estudiante no asistió' : 'estudiantes no asistieron'}.`}
        </p>
        {ausentes.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {ausentes.map((estudiante) => (
              <li key={estudiante.idMatricula}>
                {nombreEstudiante(estudiante)}
              </li>
            ))}
          </ul>
        )}
      </section>
      {detalle.observaciones && (
        <section
          aria-labelledby="titulo-observaciones"
          className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 id="titulo-observaciones" className="text-lg font-semibold">
            Observaciones
          </h2>
          <p className="whitespace-pre-line">{detalle.observaciones}</p>
        </section>
      )}
    </div>
  );
}

function CasillaTema({
  tema,
  marcado,
  alCambiar,
}: {
  tema: TemaContenido;
  marcado: boolean;
  alCambiar: (marcado: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 ${marcado ? 'border-marca bg-marca/5' : 'border-slate-200 bg-white'}`}
    >
      <input
        type="checkbox"
        checked={marcado}
        onChange={(evento) => alCambiar(evento.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-marca"
      />
      <span className="space-y-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
          Semana {tema.semana}
        </span>
        <span className="block">{tema.tema}</span>
        {tema.previsto && (
          <Insignia tono="marca">Previsto para esta semana</Insignia>
        )}
      </span>
    </label>
  );
}

function FormularioRegistro({
  detalle,
  idProyecto,
  alGuardar,
}: {
  detalle: DetalleSesion;
  idProyecto: number;
  alGuardar: (nuevo: DetalleSesion) => void;
}) {
  const { asistencia } = detalle;
  const [temas, setTemas] = useState(
    () =>
      new Set(
        detalle.temas
          .filter((tema) => tema.seleccionado)
          .map((tema) => tema.idContenido),
      ),
  );
  const [ausentes, setAusentes] = useState(
    () =>
      new Set(
        (asistencia?.estudiantes ?? [])
          .filter((estudiante) => estudiante.ausente)
          .map((estudiante) => estudiante.idMatricula),
      ),
  );
  const [adicionales, setAdicionales] = useState<string[]>(
    () => detalle.temasAdicionales,
  );
  const [nuevoAdicional, setNuevoAdicional] = useState('');
  const [avisoAdicional, setAvisoAdicional] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState(
    detalle.observaciones ?? '',
  );
  const [confirmandoTodos, setConfirmandoTodos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fallo, setFallo] = useState<Fallo | null>(null);

  // El previsto para la semana y lo ya registrado van arriba; el resto, plegado.
  const destacados = detalle.temas.filter(
    (tema) => tema.previsto || tema.seleccionado,
  );
  const otros = detalle.temas.filter(
    (tema) => !tema.previsto && !tema.seleccionado,
  );
  const matriculados = (asistencia?.estudiantes ?? []).filter(
    (estudiante) => !estudiante.retirado,
  );
  const todoElGrupo =
    matriculados.length > 0 &&
    matriculados.every((estudiante) => ausentes.has(estudiante.idMatricula));

  function alternar(
    conjunto: Set<number>,
    cambiar: (nuevo: Set<number>) => void,
    id: number,
    marcado: boolean,
  ) {
    const nuevo = new Set(conjunto);
    if (marcado) {
      nuevo.add(id);
    } else {
      nuevo.delete(id);
    }
    cambiar(nuevo);
    setConfirmandoTodos(false);
  }

  /**
   * HU-08-05: el tema escrito en el campo, si se puede agregar. Repite aquí, para avisar al
   * momento, las reglas que el backend vuelve a validar: no vacío, no repetido y no un tema
   * del contenido programático, que se marca en la lista.
   */
  function temaParaAgregar(texto: string, lista: string[]): string | null {
    const tema = limpiarTema(texto);
    if (tema === '') {
      return null;
    }
    const huella = huellaTema(tema);
    if (lista.some((otro) => huellaTema(otro) === huella)) {
      setAvisoAdicional(`«${tema}» ya está entre los temas no planeados.`);
      return null;
    }
    const planeado = detalle.temas.find(
      (contenido) => huellaTema(contenido.tema) === huella,
    );
    if (planeado) {
      setAvisoAdicional(
        `«${tema}» está en el contenido programático (semana ${planeado.semana}): márquelo en la lista de arriba.`,
      );
      return null;
    }
    if (lista.length >= TEMAS_ADICIONALES_MAXIMO) {
      setAvisoAdicional(
        `Se pueden escribir como máximo ${TEMAS_ADICIONALES_MAXIMO} temas no planeados por clase.`,
      );
      return null;
    }
    setAvisoAdicional(null);
    return tema;
  }

  function agregarAdicional() {
    const tema = temaParaAgregar(nuevoAdicional, adicionales);
    if (tema !== null) {
      setAdicionales([...adicionales, tema]);
      setNuevoAdicional('');
    }
  }

  async function enviar(
    confirmarTodoElGrupo: boolean,
    temasAdicionales: string[] = adicionales,
  ) {
    setEnviando(true);
    setFallo(null);
    try {
      const nuevo = await registrarSesion(idProyecto, detalle.sesion.id, {
        idsContenido: [...temas],
        temasAdicionales,
        ausentes: [...ausentes],
        observaciones,
        confirmarTodoElGrupo,
      });
      alGuardar(nuevo);
    } catch (error) {
      // Si el backend pide confirmar que faltó todo el grupo (RF-22, p6), se pregunta aquí. Si
      // ya se había confirmado, el 409 es por otra razón (período cerrado, por ejemplo) y se
      // muestra tal cual.
      if (
        error instanceof ErrorApi &&
        error.estado === 409 &&
        todoElGrupo &&
        !confirmarTodoElGrupo
      ) {
        setConfirmandoTodos(true);
      } else {
        setFallo({
          mensaje: mensajeParaUsuario(error),
          detalles: error instanceof ErrorApi ? error.detalles : undefined,
        });
      }
    } finally {
      setEnviando(false);
    }
  }

  function guardar(evento: FormEvent) {
    evento.preventDefault();
    // Lo que quedó escrito en el campo sin pulsar «Agregar» también se guarda: es lo que el
    // docente quiso anotar. Si no se puede agregar, el aviso lo dice y no se envía.
    let temasAdicionales = adicionales;
    if (limpiarTema(nuevoAdicional) !== '') {
      const tema = temaParaAgregar(nuevoAdicional, adicionales);
      if (tema === null) {
        return;
      }
      temasAdicionales = [...adicionales, tema];
      setAdicionales(temasAdicionales);
      setNuevoAdicional('');
    }
    // Se repite aquí para avisar sin esperar al servidor; el backend valida lo mismo.
    if (temas.size === 0 && temasAdicionales.length === 0) {
      setAviso(MENSAJE_SIN_TEMAS);
      return;
    }
    setAviso(null);
    if (todoElGrupo && !confirmandoTodos) {
      setConfirmandoTodos(true);
      return;
    }
    void enviar(todoElGrupo, temasAdicionales);
  }

  return (
    <form onSubmit={guardar} className="space-y-5" noValidate>
      <fieldset className="space-y-2">
        <legend className="text-lg font-semibold">Temas desarrollados</legend>
        <p className="text-sm text-slate-600">
          Marque los temas del contenido programático que desarrolló en esta
          clase. Si desarrolló uno que no está, escríbalo abajo, en «Temas no
          planeados».
        </p>
        {destacados.map((tema) => (
          <CasillaTema
            key={tema.idContenido}
            tema={tema}
            marcado={temas.has(tema.idContenido)}
            alCambiar={(marcado) =>
              alternar(temas, setTemas, tema.idContenido, marcado)
            }
          />
        ))}
        {otros.length > 0 && (
          <details
            className="group rounded-xl border border-slate-200 bg-white"
            open={destacados.length === 0}
          >
            {/* En el teléfono el texto ocupa dos líneas: sin relleno vertical tocaba el borde. */}
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 font-medium [&::-webkit-details-marker]:hidden">
              <span>
                Otros temas del contenido programático ({otros.length})
              </span>
              <span className="shrink-0 text-sm font-semibold text-marca">
                <span className="group-open:hidden">Ver</span>
                <span className="hidden group-open:inline">Ocultar</span>
              </span>
            </summary>
            <div className="space-y-2 p-2">
              {otros.map((tema) => (
                <CasillaTema
                  key={tema.idContenido}
                  tema={tema}
                  marcado={temas.has(tema.idContenido)}
                  alCambiar={(marcado) =>
                    alternar(temas, setTemas, tema.idContenido, marcado)
                  }
                />
              ))}
            </div>
          </details>
        )}
      </fieldset>

      {/* HU-08-05: opcional y rápido de llenar desde el teléfono, al salir del salón. */}
      <fieldset className="space-y-2">
        <legend className="text-lg font-semibold">
          Temas no planeados{' '}
          <span className="text-sm font-normal text-slate-600">(opcional)</span>
        </legend>
        <p id="ayuda-no-planeados" className="text-sm text-slate-600">
          Si desarrolló un tema que no está en el contenido programático,
          escríbalo aquí. Queda marcado como no planeado.
        </p>
        {adicionales.length > 0 && (
          <ul className="space-y-2">
            {adicionales.map((tema) => (
              <li
                key={tema}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2"
              >
                <span className="min-w-0 flex-1 break-words">{tema}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAdicionales(adicionales.filter((otro) => otro !== tema));
                    setAvisoAdicional(null);
                  }}
                  aria-label={`Quitar el tema no planeado «${tema}»`}
                  className="min-h-11 shrink-0 rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-800 hover:bg-red-50"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <label htmlFor="nuevo-no-planeado" className="sr-only">
            Tema no planeado
          </label>
          <input
            id="nuevo-no-planeado"
            type="text"
            enterKeyHint="done"
            autoComplete="off"
            maxLength={TEMA_ADICIONAL_MAXIMO}
            placeholder="Escriba el tema"
            value={nuevoAdicional}
            onChange={(evento) => {
              setNuevoAdicional(evento.target.value);
              setAvisoAdicional(null);
            }}
            onKeyDown={(evento) => {
              // Intro agrega el tema; no envía el registro a medio llenar.
              if (evento.key === 'Enter') {
                evento.preventDefault();
                agregarAdicional();
              }
            }}
            aria-describedby={`ayuda-no-planeados${avisoAdicional ? ' aviso-no-planeados' : ''}`}
            aria-invalid={avisoAdicional ? true : undefined}
            className="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base aria-[invalid=true]:border-red-500"
          />
          <button
            type="button"
            onClick={agregarAdicional}
            disabled={limpiarTema(nuevoAdicional) === ''}
            className="min-h-12 shrink-0 rounded-lg border border-marca px-4 font-semibold text-marca hover:bg-marca/5 disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
        {avisoAdicional && (
          <p
            id="aviso-no-planeados"
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {avisoAdicional}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-lg font-semibold">Asistencia</legend>
        {!asistencia?.listaCargada ? (
          <Advertencia titulo="Este curso no tiene lista de estudiantes cargada">
            <p>
              Anote en las observaciones quiénes no asistieron. Para cargar la
              lista, pídasela al administrador de URAP: la carga desde
              «Estudiantes matriculados», en la ficha del proyecto docente.
            </p>
          </Advertencia>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Marque a los estudiantes que <strong>no</strong> asistieron.
            </p>
            <p aria-live="polite" className="font-semibold">
              {ausentes.size} {ausentes.size === 1 ? 'ausente' : 'ausentes'} de{' '}
              {asistencia.totalMatriculados}
            </p>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {asistencia.estudiantes.map((estudiante) => {
                const ausente = ausentes.has(estudiante.idMatricula);
                return (
                  <li key={estudiante.idMatricula}>
                    <label
                      className={`flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 ${ausente ? 'bg-red-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={ausente}
                        onChange={(evento) =>
                          alternar(
                            ausentes,
                            setAusentes,
                            estudiante.idMatricula,
                            evento.target.checked,
                          )
                        }
                        className="size-5 shrink-0 accent-red-700"
                      />
                      <span className="min-w-0 flex-1 break-words">
                        {nombreEstudiante(estudiante)}
                        {estudiante.retirado && (
                          <span className="text-sm text-slate-500">
                            {' '}
                            (retirado)
                          </span>
                        )}
                      </span>
                      {ausente && (
                        <Insignia tono="peligro">No asistió</Insignia>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </fieldset>

      <label className="block space-y-1">
        <span className="block text-lg font-semibold">Observaciones</span>
        <span className="block text-sm text-slate-600">
          Opcional. Lo que pasó en la clase y no está en los temas.
        </span>
        <textarea
          value={observaciones}
          onChange={(evento) => setObservaciones(evento.target.value)}
          maxLength={OBSERVACIONES_MAXIMO}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
        <span className="block text-right text-xs text-slate-500 tabular-nums">
          {observaciones.length} / {OBSERVACIONES_MAXIMO}
        </span>
      </label>

      {aviso && <AvisoError mensaje={aviso} />}
      {fallo && (
        <AvisoError mensaje={fallo.mensaje} detalles={fallo.detalles} />
      )}
      {confirmandoTodos && (
        <Advertencia
          titulo={`Marcó a todo el grupo (${matriculados.length} estudiantes) como ausente`}
        >
          <p>¿Confirma que ningún estudiante asistió a esta clase?</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void enviar(true, adicionales)}
              disabled={enviando}
              className="min-h-11 rounded-lg bg-amber-700 px-4 font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              Sí, nadie asistió
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoTodos(false)}
              disabled={enviando}
              className="min-h-11 rounded-lg border border-amber-400 bg-white px-4 font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
            >
              Revisar la lista
            </button>
          </div>
        </Advertencia>
      )}

      <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:py-0">
        <button
          type="submit"
          disabled={enviando}
          className="min-h-12 w-full rounded-lg bg-marca px-4 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60 sm:w-auto"
        >
          {enviando
            ? 'Guardando…'
            : detalle.sesion.diligenciada
              ? 'Guardar cambios'
              : 'Registrar clase'}
        </button>
      </div>
    </form>
  );
}
