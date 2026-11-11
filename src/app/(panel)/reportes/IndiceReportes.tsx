'use client';

import Link from 'next/link';
import { useReportes } from '../useOpcionesMenu';

/**
 * Índice de los reportes académicos (RF-28, RF-32; URAP-126): el menú tiene una sola opción
 * «Reportes» y aquí aparecen solo los que el usuario puede abrir, con los mismos roles con que
 * el backend los protege.
 */
export function IndiceReportes() {
  const reportes = useReportes();
  return (
    <section aria-labelledby="titulo-reportes" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <h1 id="titulo-reportes" className="text-2xl font-bold sm:text-3xl">
          Reportes
        </h1>
        <p className="text-slate-700">
          Elija el reporte que quiere consultar. Todos se pueden exportar a
          Excel y PDF.
        </p>
      </div>
      {reportes.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sus roles no tienen reportes habilitados.
        </p>
      ) : (
        <nav aria-label="Reportes" className="grid gap-3 sm:grid-cols-2">
          {reportes.map((reporte) => (
            <Link
              key={reporte.ruta}
              href={reporte.ruta}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
            >
              <span className="block font-semibold text-marca">
                {reporte.etiqueta}
              </span>
              <span className="block text-sm text-slate-600">
                {reporte.descripcion}
              </span>
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
