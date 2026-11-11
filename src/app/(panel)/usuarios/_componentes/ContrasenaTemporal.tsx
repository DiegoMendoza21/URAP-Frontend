'use client';

import { useState } from 'react';

/**
 * La contraseña temporal recién generada. El backend la entrega una sola vez y guarda solo su
 * hash: si se cierra esta pantalla sin copiarla, hay que generar otra. Vive en la memoria de
 * la página; no se guarda en el navegador.
 */
export function ContrasenaTemporal({
  contrasena,
  nombre,
}: {
  contrasena: string;
  nombre: string;
}) {
  const [copiada, setCopiada] = useState<'si' | 'no' | null>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(contrasena);
      setCopiada('si');
    } catch {
      // Sin permiso para el portapapeles: queda a la vista para copiarla a mano.
      setCopiada('no');
    }
  }

  return (
    <div
      role="status"
      className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:p-6"
    >
      <p className="font-semibold">Contraseña temporal de {nombre}</p>
      <p className="rounded-lg border border-amber-300 bg-white px-3 py-3 text-center font-mono text-xl font-semibold tracking-wider break-all text-slate-900 select-all">
        {contrasena}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void copiar()}
          className="min-h-11 rounded-lg bg-marca px-4 py-2 font-semibold text-white hover:bg-marca-oscuro"
        >
          Copiar la contraseña
        </button>
        <span aria-live="polite" className="text-sm font-medium">
          {copiada === 'si' && 'Copiada.'}
          {copiada === 'no' &&
            'No se pudo copiar: selecciónela y cópiela a mano.'}
        </span>
      </div>
      <p className="text-sm">
        <strong>Solo se muestra esta vez.</strong> Cópiela y entréguesela a la
        persona por un medio seguro. El sistema no la guarda: si la pierde,
        genere otra desde la página del usuario.
      </p>
    </div>
  );
}
