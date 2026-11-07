import type { ReactNode } from 'react';

/* Piezas que comparten las secciones del diligenciamiento (puntos 2 a 7). */

export function BotonGuardar({
  guardando,
  deshabilitado = false,
  children,
}: {
  guardando: boolean;
  deshabilitado?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={guardando || deshabilitado}
      className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
    >
      {guardando ? 'Guardando…' : children}
    </button>
  );
}

export function BotonSecundario({
  onClick,
  children,
  peligro = false,
  disabled = false,
  etiqueta,
  tipo = 'button',
}: {
  onClick?: () => void;
  children: ReactNode;
  peligro?: boolean;
  disabled?: boolean;
  /** Nombre accesible cuando el texto visible no basta («Subir referencia 3»). */
  etiqueta?: string;
  tipo?: 'button' | 'submit';
}) {
  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
        peligro
          ? 'border-red-300 text-red-800 hover:bg-red-50'
          : 'border-slate-300 text-slate-800 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

/** Estado del guardado de una sección (HU-06-08): guardado, con cambios o última fecha. */
export function ConfirmacionGuardado({
  visible,
  pendiente,
  ultimaModificacion,
}: {
  visible: boolean;
  pendiente: boolean;
  ultimaModificacion: string | null;
}) {
  return (
    <p role="status" className="text-sm text-slate-600">
      {pendiente ? (
        <span className="font-medium text-amber-800">
          Tiene cambios sin guardar.
        </span>
      ) : visible ? (
        <span className="font-medium text-emerald-700">Cambios guardados.</span>
      ) : null}
      {!pendiente && ultimaModificacion && (
        <span className="block sm:ml-1 sm:inline">
          Última modificación del proyecto: {ultimaModificacion}
        </span>
      )}
    </p>
  );
}
