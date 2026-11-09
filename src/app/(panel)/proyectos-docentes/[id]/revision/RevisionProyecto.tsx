'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useId, useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import { consultarDiligenciamiento } from '@/api/diligenciamiento';
import {
  consultarProyectoDocente,
  nombreDocente,
} from '@/api/proyectos-docentes';
import {
  aprobarProyecto,
  devolverProyecto,
  MOTIVO_NO_REVISABLE,
  type ObservacionEntrada,
  type TransicionProyecto,
  verificarRevision,
} from '@/api/revision';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { PANTALLAS } from '../diligenciar/DiligenciamientoProyecto';

/** Mismo límite que el backend para cada observación (RF-18). */
const OBSERVACION_MAXIMA = 2000;
const OBSERVACION_GENERAL_MAXIMA = 4000;
const MENSAJE_SIN_OBSERVACIONES =
  'Escriba al menos una observación en alguna sección para devolver el proyecto.';

const nada = () => {};

type Decision = 'aprobar' | 'devolver';

/** La decisión tomada y el estado en que quedó el proyecto, según el backend. */
type Resultado = { estado: TransicionProyecto['estado'] } & (
  { tipo: 'aprobado' } | { tipo: 'devuelto'; cantidad: number }
);

/**
 * Revisión del proyecto docente por el departamento académico (RF-18, p2 a p4; HU-07-03 y
 * HU-07-04): las secciones en solo lectura, con un campo de observación debajo de cada una, y
 * las decisiones de aprobar o devolver. El backend comprueba el permiso y el programa, y dice
 * antes si este usuario puede decidir: quien es docente del proyecto ve el aviso en lugar de
 * las decisiones, porque debe revisarlo otra persona (separación de funciones).
 */
export function RevisionProyecto() {
  const { id } = useParams<{ id: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;
  const proyecto = useConsulta(
    idProyecto === null ? null : `proyecto-${idProyecto}`,
    (senal) => consultarProyectoDocente(idProyecto!, senal),
  );
  const resumen = useConsulta(
    idProyecto === null ? null : `diligenciamiento-${idProyecto}`,
    (senal) => consultarDiligenciamiento(idProyecto!, senal),
  );
  const verificacion = useConsulta(
    idProyecto === null ? null : `revision-${idProyecto}`,
    (senal) => verificarRevision(idProyecto!, senal),
  );
  const [observaciones, setObservaciones] = useState<Record<string, string>>(
    {},
  );
  const [general, setGeneral] = useState('');
  const [decidiendo, setDecidiendo] = useState<Decision | null>(null);
  /** La decisión que espera confirmación; nula mientras no se pulse ninguna. */
  const [porConfirmar, setPorConfirmar] = useState<Decision | null>(null);
  const [error, setError] = useState<{
    mensaje: string;
    detalles?: string[];
  } | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const escritas: ObservacionEntrada[] = Object.entries(observaciones)
    // Las claves son las de las secciones que mandó el backend; él vuelve a validarlas.
    .map(([seccion, texto]) => ({
      seccion: seccion as ObservacionEntrada['seccion'],
      observacion: texto.trim(),
    }))
    .filter((observacion) => observacion.observacion !== '');
  const enviado =
    resumen.estado === 'lista' && resumen.datos.estado?.codigo === 'enviado';
  // RF-18: `puedeRevisar` es la única señal para mostrar las decisiones. Sin respuesta, o si la
  // verificación responde 403 (no aprueba en este programa, como el Administrador), no hay.
  const puedeDecidir =
    !resultado &&
    verificacion.estado === 'lista' &&
    verificacion.datos.puedeRevisar;
  // El aviso de quien no puede revisar un proyecto enviado: por ejemplo, es docente de él.
  const impedimento =
    enviado &&
    verificacion.estado === 'lista' &&
    !verificacion.datos.puedeRevisar
      ? (verificacion.datos.motivo ?? MOTIVO_NO_REVISABLE)
      : null;
  // Tras decidir, el estado que devolvió el backend: el resumen no se vuelve a pedir.
  const estado =
    resultado?.estado ??
    (resumen.estado === 'lista' ? resumen.datos.estado : null);

  /** Pide confirmar la decisión dentro de la página (URAP-124), como al cerrar la medición. */
  function pedirConfirmacion(accion: Decision) {
    setError(null);
    if (accion === 'devolver' && escritas.length === 0) {
      setError({ mensaje: MENSAJE_SIN_OBSERVACIONES });
      return;
    }
    setPorConfirmar(accion);
  }

  async function decidir(accion: Decision) {
    setError(null);
    setDecidiendo(accion);
    const nota = general.trim() || undefined;
    try {
      if (accion === 'aprobar') {
        const { estado } = await aprobarProyecto(idProyecto!, nota);
        setResultado({ tipo: 'aprobado', estado });
      } else {
        const { estado } = await devolverProyecto(idProyecto!, escritas, nota);
        setResultado({ tipo: 'devuelto', cantidad: escritas.length, estado });
      }
    } catch (causa) {
      setError({
        mensaje: mensajeParaUsuario(causa),
        detalles: causa instanceof ErrorApi ? causa.detalles : undefined,
      });
    } finally {
      setDecidiendo(null);
      setPorConfirmar(null);
    }
  }

  return (
    <section className="space-y-5">
      <Link
        href="/revision"
        className="text-sm font-medium text-marca hover:underline"
      >
        ← Proyectos pendientes de revisión
      </Link>

      {idProyecto === null && (
        <AvisoError mensaje="El proyecto docente no existe o no tiene acceso a él." />
      )}
      {(proyecto.estado === 'cargando' ||
        resumen.estado === 'cargando' ||
        verificacion.estado === 'cargando') && <Cargando />}
      {proyecto.estado === 'fallida' && (
        <AvisoError
          mensaje={proyecto.mensaje}
          reintentar={proyecto.reintentable ? proyecto.reintentar : undefined}
        />
      )}

      {proyecto.estado === 'lista' && resumen.estado === 'lista' && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">
              Revisión del proyecto docente
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {proyecto.datos.asignatura}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {estado && <Insignia tono="marca">{estado.nombre}</Insignia>}
              {proyecto.datos.periodo && (
                <Insignia>Período {proyecto.datos.periodo}</Insignia>
              )}
              {proyecto.datos.grupo && (
                <Insignia>Grupo {proyecto.datos.grupo}</Insignia>
              )}
            </div>
            <p className="text-sm text-slate-700">
              {proyecto.datos.docentes
                .map(
                  (docente) =>
                    `${nombreDocente(docente)}${docente.responsable ? ' (responsable)' : ''}`,
                )
                .join(' · ')}
            </p>
            <Link
              href={`/proyectos-docentes/${idProyecto}`}
              className="inline-block text-sm font-medium text-marca hover:underline"
            >
              Ver la ficha y el historial de revisiones
            </Link>
          </div>

          {resultado ? (
            <ResultadoRevision resultado={resultado} />
          ) : !enviado ? (
            <Advertencia titulo="Este proyecto no está pendiente de revisión">
              <p>
                Está «{resumen.datos.estado?.nombre ?? 'sin estado'}». Solo se
                aprueban o devuelven los proyectos enviados a revisión.
              </p>
            </Advertencia>
          ) : impedimento ? (
            <Advertencia titulo={impedimento} />
          ) : (
            // Un 403 o un 404 no es un error que el usuario pueda resolver: solo no hay
            // decisiones. Si la consulta falló por la red o el servidor, se puede reintentar.
            verificacion.estado === 'fallida' &&
            verificacion.reintentable && (
              <AvisoError
                mensaje={verificacion.mensaje}
                reintentar={verificacion.reintentar}
              />
            )
          )}

          {resumen.datos.secciones.map((seccion) => {
            const Pantalla = PANTALLAS[seccion.clave];
            const campo = `observacion-${seccion.clave}`;
            return (
              <section
                key={seccion.clave}
                aria-labelledby={`titulo-${seccion.clave}`}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    id={`titulo-${seccion.clave}`}
                    className="text-lg font-semibold"
                  >
                    {seccion.numero}. {seccion.titulo}
                  </h2>
                  <Insignia tono={seccion.completa ? 'neutro' : 'advertencia'}>
                    {seccion.completa ? 'Completa' : 'Con pendientes'}
                  </Insignia>
                </div>
                {Pantalla && (
                  <Pantalla
                    idProyecto={idProyecto!}
                    puedeEditar={false}
                    alGuardar={nada}
                    alCambiar={nada}
                  />
                )}
                {puedeDecidir && (
                  <div className="space-y-1 border-t border-slate-200 pt-3">
                    <label
                      htmlFor={campo}
                      className="block text-sm font-medium"
                    >
                      Observación para el docente sobre el punto{' '}
                      {seccion.numero} (opcional)
                    </label>
                    <textarea
                      id={campo}
                      rows={3}
                      maxLength={OBSERVACION_MAXIMA}
                      value={observaciones[seccion.clave] ?? ''}
                      onChange={(evento) =>
                        setObservaciones((previas) => ({
                          ...previas,
                          [seccion.clave]: evento.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-marca"
                    />
                  </div>
                )}
              </section>
            );
          })}

          {puedeDecidir && (
            <section
              aria-labelledby="titulo-decision"
              className="space-y-3 rounded-2xl border border-marca/30 bg-white p-4 shadow-sm sm:p-6"
            >
              <h2 id="titulo-decision" className="text-lg font-semibold">
                Decisión
              </h2>
              <div className="space-y-1">
                <label
                  htmlFor="observacion-general"
                  className="block text-sm font-medium"
                >
                  Observación general (opcional)
                </label>
                <textarea
                  id="observacion-general"
                  rows={3}
                  maxLength={OBSERVACION_GENERAL_MAXIMA}
                  value={general}
                  onChange={(evento) => setGeneral(evento.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-marca"
                />
              </div>
              <p className="text-sm text-slate-600">
                {escritas.length === 0
                  ? 'Para devolverlo, escriba al menos una observación en alguna sección.'
                  : escritas.length === 1
                    ? 'Escribió una observación por sección.'
                    : `Escribió ${escritas.length} observaciones por sección.`}
              </p>
              {error && (
                <AvisoError mensaje={error.mensaje} detalles={error.detalles} />
              )}
              {porConfirmar === null ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => pedirConfirmacion('aprobar')}
                    className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro sm:w-auto sm:py-2"
                  >
                    Aprobar el proyecto
                  </button>
                  <button
                    type="button"
                    onClick={() => pedirConfirmacion('devolver')}
                    className="w-full rounded-lg border border-amber-400 bg-white px-4 py-3 font-semibold text-amber-950 hover:bg-amber-50 sm:w-auto sm:py-2"
                  >
                    Devolver con observaciones
                  </button>
                </div>
              ) : (
                <ConfirmarDecision
                  accion={porConfirmar}
                  observaciones={escritas.length}
                  decidiendo={decidiendo !== null}
                  alConfirmar={() => void decidir(porConfirmar)}
                  alCancelar={() => setPorConfirmar(null)}
                />
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}

/** El texto de la confirmación: lo que pasa al aprobar o al devolver. */
function textoConfirmacion(accion: Decision, observaciones: number): string {
  if (accion === 'aprobar') {
    return observaciones > 0
      ? 'Escribió observaciones por sección: al aprobar no se envían al docente. ¿Desea aprobar el proyecto de todas formas?'
      : '¿Aprobar el proyecto docente? El docente podrá registrar sus clases y el proyecto ya no se podrá editar.';
  }
  return `¿Devolver el proyecto con ${observaciones === 1 ? 'una observación' : `${observaciones} observaciones`}? El docente podrá editarlo de nuevo.`;
}

/**
 * Confirmación dentro de la página (URAP-124), la misma forma que la de cerrar la medición: en
 * el teléfono se ve igual en todos los navegadores. Cancelar no borra las observaciones.
 */
function ConfirmarDecision({
  accion,
  observaciones,
  decidiendo,
  alConfirmar,
  alCancelar,
}: {
  accion: Decision;
  observaciones: number;
  decidiendo: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  const id = useId();
  return (
    <div
      role="alertdialog"
      aria-labelledby={`${id}-confirmar`}
      className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-3"
    >
      <p id={`${id}-confirmar`} className="text-sm">
        {textoConfirmacion(accion, observaciones)}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={decidiendo}
          onClick={alConfirmar}
          className={
            accion === 'aprobar'
              ? 'w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-50 sm:w-auto sm:py-2'
              : 'w-full rounded-lg border border-amber-400 bg-amber-100 px-4 py-3 font-semibold text-amber-950 hover:bg-amber-200 disabled:opacity-50 sm:w-auto sm:py-2'
          }
        >
          {accion === 'aprobar'
            ? decidiendo
              ? 'Aprobando…'
              : 'Sí, aprobar el proyecto'
            : decidiendo
              ? 'Devolviendo…'
              : 'Sí, devolver el proyecto'}
        </button>
        <button
          type="button"
          disabled={decidiendo}
          onClick={alCancelar}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold disabled:opacity-50 sm:w-auto sm:py-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ResultadoRevision({ resultado }: { resultado: Resultado }) {
  return (
    <div
      role="status"
      className="space-y-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950"
    >
      <p className="font-semibold">
        {resultado.tipo === 'aprobado'
          ? 'Proyecto aprobado.'
          : 'Proyecto devuelto con observaciones.'}
      </p>
      <p className="text-sm">
        {resultado.tipo === 'aprobado'
          ? 'Se avisó a los docentes. Ya pueden registrar sus clases.'
          : `Se avisó a los docentes con ${resultado.cantidad === 1 ? 'la observación' : `las ${resultado.cantidad} observaciones`}. Podrán editarlo y enviarlo de nuevo.`}
      </p>
      <Link
        href="/revision"
        className="inline-block font-semibold text-marca hover:underline"
      >
        Volver a los pendientes
      </Link>
    </div>
  );
}
