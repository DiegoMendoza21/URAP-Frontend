'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Confirmación dentro de la página, con la misma forma que la de aprobar un proyecto
 * (URAP-124): en el teléfono se ve igual en todos los navegadores. Al aparecer, el foco pasa
 * a «Cancelar», para que una tecla de más no confirme nada.
 */
export function Confirmacion({
  children,
  textoConfirmar,
  peligro = false,
  ocupado,
  alConfirmar,
  alCancelar,
}: {
  children: ReactNode;
  textoConfirmar: string;
  /** La acción quita acceso (inactivar, revocar): el botón va en rojo. */
  peligro?: boolean;
  ocupado: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  const cancelar = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelar.current?.focus(), []);
  return (
    <div
      role="group"
      aria-label="Confirmación"
      className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <div className="space-y-1 text-sm">{children}</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={ocupado}
          onClick={alConfirmar}
          className={`min-h-11 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60 ${
            peligro
              ? 'bg-red-700 hover:bg-red-800'
              : 'bg-marca hover:bg-marca-oscuro'
          }`}
        >
          {ocupado ? 'Un momento…' : textoConfirmar}
        </button>
        <button
          ref={cancelar}
          type="button"
          disabled={ocupado}
          onClick={alCancelar}
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
