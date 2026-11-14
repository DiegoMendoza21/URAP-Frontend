'use client';

import Link from 'next/link';
import { useConfiguracion } from '../useOpcionesMenu';

/**
 * Índice de la configuración del sistema (HU-08-01): el menú tiene una sola opción
 * «Configuración» y aquí aparecen las pantallas que el usuario puede abrir, con el mismo
 * permiso con que el backend las protege.
 */
export function IndiceConfiguracion() {
  const opciones = useConfiguracion();
  return (
    <section aria-labelledby="titulo-configuracion" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <h1
          id="titulo-configuracion"
          className="text-2xl font-bold sm:text-3xl"
        >
          Configuración
        </h1>
        <p className="text-slate-700">
          Lo que el sistema permite ajustar sin cambiar el código. Cada cambio
          queda en el registro de auditoría.
        </p>
      </div>
      {opciones.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sus roles no tienen permiso para configurar el sistema.
        </p>
      ) : (
        <nav aria-label="Configuración" className="grid gap-3 sm:grid-cols-2">
          {opciones.map((opcion) => (
            <Link
              key={opcion.ruta}
              href={opcion.ruta}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
            >
              <span className="block font-semibold text-marca">
                {opcion.etiqueta}
              </span>
              <span className="block text-sm text-slate-600">
                {opcion.descripcion}
              </span>
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
