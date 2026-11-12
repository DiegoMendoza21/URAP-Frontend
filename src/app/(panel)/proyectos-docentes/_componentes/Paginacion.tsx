/** Anterior y Siguiente de una lista paginada. No se muestra si cabe en una página. */
export function Paginacion({
  etiqueta,
  pagina,
  total,
  tamano,
  alCambiar,
}: {
  etiqueta: string;
  pagina: number;
  total: number;
  tamano: number;
  alCambiar: (pagina: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamano));
  if (totalPaginas <= 1) {
    return null;
  }
  return (
    <nav
      aria-label={etiqueta}
      className="flex items-center justify-between gap-3"
    >
      <button
        type="button"
        disabled={pagina <= 1}
        onClick={() => alCambiar(pagina - 1)}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
      >
        Anterior
      </button>
      <span className="text-sm text-slate-700">
        Página {pagina} de {totalPaginas}
      </span>
      <button
        type="button"
        disabled={pagina >= totalPaginas}
        onClick={() => alCambiar(pagina + 1)}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
      >
        Siguiente
      </button>
    </nav>
  );
}
