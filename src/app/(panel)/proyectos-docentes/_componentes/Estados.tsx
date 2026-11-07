import type { ReactNode } from 'react';

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p role="status" className="py-6 text-sm text-slate-600">
      {texto}
    </p>
  );
}

export function AvisoError({
  mensaje,
  detalles,
  reintentar,
}: {
  mensaje: string;
  detalles?: string[];
  reintentar?: () => void;
}) {
  return (
    <div
      role="alert"
      className="space-y-2 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-800"
    >
      <p>{mensaje}</p>
      {detalles && detalles.length > 0 && (
        <ul className="list-disc pl-5">
          {detalles.map((detalle) => (
            <li key={detalle}>{detalle}</li>
          ))}
        </ul>
      )}
      {reintentar && (
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

/** Advertencia que no impide continuar, como la información incompleta (RF-08, p7). */
export function Advertencia({
  titulo,
  children,
}: {
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950"
    >
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mt-1 space-y-2">{children}</div>}
    </div>
  );
}

export function Insignia({
  children,
  tono = 'neutro',
}: {
  children: ReactNode;
  /** `peligro`: sesiones vencidas (RF-23). `informativo`: festivos y otros datos sin alerta. */
  tono?: 'neutro' | 'marca' | 'advertencia' | 'peligro' | 'informativo';
}) {
  const colores = {
    neutro: 'bg-slate-100 text-slate-800',
    marca: 'bg-marca/10 text-marca',
    advertencia: 'bg-amber-100 text-amber-900',
    peligro: 'bg-red-100 text-red-800',
    informativo: 'bg-sky-100 text-sky-900',
  }[tono];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colores}`}
    >
      {children}
    </span>
  );
}
