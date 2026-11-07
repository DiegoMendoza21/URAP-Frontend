'use client';

import Link from 'next/link';
import { useSesion } from '@/sesion/ProveedorSesion';
import { usePermisos } from '@/sesion/permisos';
import { OPCIONES_MENU } from './menu';

/**
 * Panel inicial después de iniciar sesión (RF-01, p4): los roles del usuario y un acceso por
 * cada opción que habilitan sus permisos (HU-01-03), los mismos del menú.
 */
export function PanelInicial() {
  const { sesion } = useSesion();
  const tiene = usePermisos();
  if (sesion.estado !== 'autenticado') {
    return null;
  }
  const { nombres, roles } = sesion.usuario;
  const opciones = OPCIONES_MENU.filter((opcion) => tiene(opcion.permiso));

  return (
    <section aria-labelledby="titulo-panel" className="space-y-6">
      <h1 id="titulo-panel" className="text-2xl font-bold sm:text-3xl">
        {nombres ? `Hola, ${nombres}` : 'Hola'}
      </h1>
      <div>
        <h2 className="text-sm font-semibold text-slate-600">Sus roles</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {roles.map((rol) => (
            <li
              key={rol}
              className="rounded-full bg-marca/10 px-3 py-1 text-sm font-medium text-marca"
            >
              {rol}
            </li>
          ))}
        </ul>
      </div>
      {opciones.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Su usuario todavía no tiene opciones habilitadas. Comuníquese con el
          administrador de URAP.
        </p>
      ) : (
        <nav aria-label="Accesos" className="grid gap-3 sm:grid-cols-2">
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
                {opcion.ruta === '/proyectos-docentes' &&
                tiene('proyectos.crear')
                  ? 'Cree los proyectos del período y asigne los docentes.'
                  : opcion.descripcion}
              </span>
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
