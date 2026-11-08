'use client';

import { useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  enviarARevision,
  verificarEnvio,
  type VerificacionEnvio,
} from '@/api/revision';
import { Advertencia, AvisoError } from '../../_componentes/Estados';
import { BotonSecundario } from './Controles';

type Paso =
  | { tipo: 'inicio' }
  | { tipo: 'verificando' }
  | { tipo: 'resumen'; verificacion: VerificacionEnvio }
  | { tipo: 'enviando'; verificacion: VerificacionEnvio }
  | { tipo: 'enviado' };

/**
 * Envío del proyecto a revisión (RF-17, HU-07-01): el sistema verifica las secciones (p2),
 * presenta el resumen (p3), el docente confirma (p4) y el proyecto pasa a «Enviado a
 * revisión» (p5). Quién puede enviar y qué falta lo decide el backend.
 */
export function PanelEnvio({
  idProyecto,
  alEnviar,
  irASeccion,
}: {
  idProyecto: number;
  /** Tras enviar: el resumen y las observaciones cambian. */
  alEnviar: () => void;
  irASeccion: (clave: string) => void;
}) {
  const [paso, setPaso] = useState<Paso>({ tipo: 'inicio' });
  const [error, setError] = useState<{
    mensaje: string;
    detalles?: string[];
  } | null>(null);

  async function verificar() {
    setPaso({ tipo: 'verificando' });
    setError(null);
    try {
      setPaso({
        tipo: 'resumen',
        verificacion: await verificarEnvio(idProyecto),
      });
    } catch (causa) {
      setError({ mensaje: mensajeParaUsuario(causa) });
      setPaso({ tipo: 'inicio' });
    }
  }

  async function confirmar(verificacion: VerificacionEnvio) {
    setPaso({ tipo: 'enviando', verificacion });
    setError(null);
    try {
      await enviarARevision(idProyecto);
      setPaso({ tipo: 'enviado' });
      alEnviar();
    } catch (causa) {
      setError({
        mensaje: mensajeParaUsuario(causa),
        detalles: causa instanceof ErrorApi ? causa.detalles : undefined,
      });
      setPaso({ tipo: 'resumen', verificacion });
    }
  }

  return (
    <section
      aria-labelledby="titulo-envio"
      className="space-y-3 rounded-2xl border border-marca/30 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="titulo-envio" className="text-lg font-semibold">
        Enviar a revisión
      </h2>

      {paso.tipo === 'enviado' ? (
        <p role="status" className="font-medium text-emerald-700">
          Proyecto enviado a revisión. El departamento académico ya lo tiene en
          su bandeja; mientras lo revisa, el proyecto queda en solo lectura.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-700">
            Cuando termine los puntos 2 a 7, envíelo al departamento académico.
            Mientras lo revisa no podrá editarlo.
          </p>

          {(paso.tipo === 'resumen' || paso.tipo === 'enviando') && (
            <ResumenVerificacion
              verificacion={paso.verificacion}
              irASeccion={irASeccion}
            />
          )}

          {error && (
            <AvisoError mensaje={error.mensaje} detalles={error.detalles} />
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {paso.tipo === 'inicio' || paso.tipo === 'verificando' ? (
              <button
                type="button"
                onClick={() => void verificar()}
                disabled={paso.tipo === 'verificando'}
                className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {paso.tipo === 'verificando'
                  ? 'Verificando…'
                  : 'Revisar y enviar'}
              </button>
            ) : (
              <>
                {paso.verificacion.puedeEnviar && (
                  <button
                    type="button"
                    onClick={() => void confirmar(paso.verificacion)}
                    disabled={paso.tipo === 'enviando'}
                    className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    {paso.tipo === 'enviando'
                      ? 'Enviando…'
                      : 'Confirmar el envío'}
                  </button>
                )}
                <BotonSecundario
                  onClick={() => void verificar()}
                  disabled={paso.tipo === 'enviando'}
                >
                  Verificar de nuevo
                </BotonSecundario>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ResumenVerificacion({
  verificacion,
  irASeccion,
}: {
  verificacion: VerificacionEnvio;
  irASeccion: (clave: string) => void;
}) {
  return (
    <div className="space-y-3">
      {verificacion.puedeEnviar ? (
        <p role="status" className="font-medium text-emerald-700">
          Las seis secciones están completas. Puede enviarlo.
        </p>
      ) : (
        verificacion.motivo && (
          <p role="status" className="font-medium text-amber-900">
            {verificacion.motivo}
          </p>
        )
      )}

      {verificacion.seccionesIncompletas.length > 0 && (
        <ul className="space-y-2">
          {verificacion.seccionesIncompletas.map((seccion) => (
            <li
              key={seccion.clave}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-amber-950">
                  {seccion.numero}. {seccion.titulo}
                </p>
                <button
                  type="button"
                  onClick={() => irASeccion(seccion.clave)}
                  className="min-h-11 rounded-lg px-2 font-semibold text-marca hover:underline"
                >
                  Ir al punto {seccion.numero}
                </button>
              </div>
              <ul className="list-disc pl-5 text-amber-900">
                {seccion.pendientes.map((pendiente) => (
                  <li key={pendiente}>{pendiente}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {verificacion.puedeEnviar &&
        verificacion.observacionesSinResolver > 0 && (
          <Advertencia
            titulo={
              verificacion.observacionesSinResolver === 1
                ? 'Queda una observación sin marcar como resuelta'
                : `Quedan ${verificacion.observacionesSinResolver} observaciones sin marcar como resueltas`
            }
          >
            <p>
              Puede enviarlo igual, pero revise que haya atendido lo que pidió
              el departamento académico.
            </p>
          </Advertencia>
        )}
    </div>
  );
}
