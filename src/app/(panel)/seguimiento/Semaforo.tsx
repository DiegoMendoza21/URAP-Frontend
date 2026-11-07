import type { ColorSemaforo } from '@/api/seguimiento';

/** Etiqueta de cada color: el color nunca va solo, siempre con su palabra (accesibilidad). */
export const ETIQUETA_COLOR: Record<ColorSemaforo, string> = {
  rojo: 'Atrasado',
  amarillo: 'Requiere atención',
  verde: 'Al día',
};

const CLASES: Record<ColorSemaforo, { punto: string; texto: string }> = {
  rojo: { punto: 'bg-red-600', texto: 'text-red-800' },
  amarillo: { punto: 'bg-amber-500', texto: 'text-amber-900' },
  verde: { punto: 'bg-emerald-600', texto: 'text-emerald-800' },
};

/**
 * Indicador de color del proyecto (RF-25, p4). La regla la decide el backend
 * (`semaforoDelProyecto`); aquí solo se pinta, con la palabra al lado del color.
 */
export function Semaforo({ color }: { color: ColorSemaforo }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap ${CLASES[color].texto}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-3 rounded-full ${CLASES[color].punto}`}
      />
      {ETIQUETA_COLOR[color]}
    </span>
  );
}

/** Borde del color del proyecto, para las tarjetas. */
export const BORDE_COLOR: Record<ColorSemaforo, string> = {
  rojo: 'border-l-red-600',
  amarillo: 'border-l-amber-500',
  verde: 'border-l-emerald-600',
};
