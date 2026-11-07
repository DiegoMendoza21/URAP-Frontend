/** Porcentajes con dos decimales y coma decimal, como se escriben en Colombia (es-CO). */
const formatoPorcentaje = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 85.29 → «85,29 %». Nulo → «—». */
export function porcentaje(valor: number | null | undefined): string {
  return valor === null || valor === undefined
    ? '—'
    : `${formatoPorcentaje.format(valor)} %`;
}
