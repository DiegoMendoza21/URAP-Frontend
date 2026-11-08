'use client';

import { useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import { marcarObservacion, type Observacion } from '@/api/revision';

/**
 * Observaciones de la devolución para una sección (HU-07-05), arriba de la sección para que el
 * docente corrija sin adivinar. Un docente asignado las marca como resueltas mientras el
 * proyecto está devuelto; el backend lo vuelve a comprobar.
 */
export function ObservacionesSeccion({
  idProyecto,
  observaciones,
  puedeMarcar,
  alMarcar,
}: {
  idProyecto: number;
  observaciones: Observacion[];
  puedeMarcar: boolean;
  alMarcar: (observacion: Observacion) => void;
}) {
  // Se marca de inmediato y se revierte si el servidor no lo guarda.
  const [guardando, setGuardando] = useState<{
    id: number;
    resuelta: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (observaciones.length === 0) {
    return null;
  }

  async function cambiar(observacion: Observacion, resuelta: boolean) {
    setGuardando({ id: observacion.id, resuelta });
    setError(null);
    try {
      alMarcar(await marcarObservacion(idProyecto, observacion.id, resuelta));
    } catch (causa) {
      setError(mensajeParaUsuario(causa));
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-semibold">Observaciones de la revisión</p>
      <ul className="space-y-2">
        {observaciones.map((observacion) => (
          <li key={observacion.id} className="rounded-lg bg-white/70 px-3 py-2">
            <p
              className={
                observacion.resuelta ? 'text-slate-500 line-through' : undefined
              }
            >
              {observacion.observacion}
            </p>
            {puedeMarcar ? (
              <label className="mt-2 flex min-h-11 items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  className="size-5 accent-marca"
                  checked={
                    guardando?.id === observacion.id
                      ? guardando.resuelta
                      : observacion.resuelta
                  }
                  disabled={guardando !== null}
                  onChange={(evento) =>
                    void cambiar(observacion, evento.target.checked)
                  }
                />
                La resolví
                {guardando?.id === observacion.id && (
                  <span className="font-normal text-slate-600">
                    (guardando…)
                  </span>
                )}
              </label>
            ) : (
              observacion.resuelta && (
                <p className="mt-1 font-medium text-emerald-800">
                  Marcada como resuelta.
                </p>
              )
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
