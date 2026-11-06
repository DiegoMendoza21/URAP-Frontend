'use client';

import { useSesion } from '@/sesion/ProveedorSesion';

/**
 * Panel inicial después de iniciar sesión (RF-01, p4). El menú según los roles llega con
 * HU-01-03.
 */
export function PanelInicial() {
  const { sesion } = useSesion();
  if (sesion.estado !== 'autenticado') {
    return null;
  }
  const { nombres, roles } = sesion.usuario;

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
    </section>
  );
}
