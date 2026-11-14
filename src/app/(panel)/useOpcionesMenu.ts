'use client';

import { useSesion } from '@/sesion/ProveedorSesion';
import { usePermisos } from '@/sesion/permisos';
import {
  CONFIGURACION,
  OPCIONES_MENU,
  type OpcionMenu,
  REPORTES,
} from './menu';

/**
 * Si el usuario puede abrir una opción: por el permiso de la matriz o, donde el backend usa
 * `@Roles`, por sus roles. Es presentación: el backend vuelve a comprobarlo y responde 403.
 */
function usePuedeAbrir(): (opcion: OpcionMenu) => boolean {
  const { sesion } = useSesion();
  const tiene = usePermisos();
  const roles: readonly string[] =
    sesion.estado === 'autenticado' ? sesion.usuario.roles : [];
  return (opcion) =>
    opcion.permiso
      ? tiene(opcion.permiso)
      : opcion.roles.some((rol) => roles.includes(rol));
}

/** Las opciones del menú que el usuario puede abrir. */
export function useOpcionesMenu(): readonly OpcionMenu[] {
  return OPCIONES_MENU.filter(usePuedeAbrir());
}

/** Los reportes que el usuario puede abrir, para la página índice `/reportes` (URAP-126). */
export function useReportes(): readonly OpcionMenu[] {
  return REPORTES.filter(usePuedeAbrir());
}

/** Lo que el usuario puede configurar, para la página índice `/configuracion` (HU-08-01). */
export function useConfiguracion(): readonly OpcionMenu[] {
  return CONFIGURACION.filter(usePuedeAbrir());
}
