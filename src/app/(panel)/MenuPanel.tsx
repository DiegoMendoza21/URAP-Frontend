'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermisos } from '@/sesion/permisos';
import { OPCIONES_MENU } from './menu';

/**
 * Menú del panel (RF-01, p4; HU-01-03): solo las opciones que habilitan los permisos del
 * usuario, que son la unión de los de todos sus roles. Ocultar una opción es presentación: si
 * alguien abre la ruta igual, el backend responde 403 y la pantalla lo dice.
 */
export function MenuPanel() {
  const tiene = usePermisos();
  const ruta = usePathname();
  const opciones = OPCIONES_MENU.filter((opcion) => tiene(opcion.permiso));

  const enlaces = [{ ruta: '/', etiqueta: 'Inicio' }, ...opciones];
  return (
    <nav
      aria-label="Menú principal"
      className="border-b border-slate-200 bg-white"
    >
      <ul className="mx-auto flex w-full max-w-5xl flex-wrap gap-1 px-2 py-1 sm:px-4">
        {enlaces.map((enlace) => {
          const actual =
            enlace.ruta === '/'
              ? ruta === '/'
              : ruta === enlace.ruta || ruta.startsWith(`${enlace.ruta}/`);
          return (
            <li key={enlace.ruta}>
              <Link
                href={enlace.ruta}
                aria-current={actual ? 'page' : undefined}
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-marca aria-[current=page]:bg-marca/10 aria-[current=page]:text-marca"
              >
                {enlace.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
