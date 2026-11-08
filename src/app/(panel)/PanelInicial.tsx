'use client';

import Link from 'next/link';
import { useSesion } from '@/sesion/ProveedorSesion';
import { usePermisos } from '@/sesion/permisos';
import { ROL } from './menu';
import { PendientesDocente } from './PendientesDocente';
import { ProyectosDevueltos } from './ProyectosDevueltos';
import { useOpcionesMenu } from './useOpcionesMenu';

/**
 * Panel inicial después de iniciar sesión (RF-01, p4): los roles del usuario, un acceso por
 * cada opción que puede abrir (HU-01-03), las mismas del menú, y, para el docente, los
 * proyectos que le devolvieron con observaciones (RF-18) y sus sesiones vencidas y por vencer
 * (RF-23, p5).
 */
export function PanelInicial() {
  const { sesion } = useSesion();
  const tiene = usePermisos();
  const opciones = useOpcionesMenu();
  if (sesion.estado !== 'autenticado') {
    return null;
  }
  const { id, nombres, roles } = sesion.usuario;

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
      {/* Lo propio del docente: los proyectos que le devolvieron y las sesiones de sus cursos. */}
      {roles.includes(ROL.docente) && <ProyectosDevueltos idUsuario={id} />}
      {roles.includes(ROL.docente) && <PendientesDocente />}
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
                {opcion.descripcionSi && tiene(opcion.descripcionSi.permiso)
                  ? opcion.descripcionSi.texto
                  : opcion.descripcion}
              </span>
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
