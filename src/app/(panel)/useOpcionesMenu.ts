'use client';

import { useSesion } from '@/sesion/ProveedorSesion';
import { usePermisos } from '@/sesion/permisos';
import { OPCIONES_MENU, type OpcionMenu } from './menu';

/**
 * Las opciones del menú que el usuario puede abrir: por el permiso de la matriz o, donde el
 * backend usa `@Roles`, por sus roles. Es presentación: el backend vuelve a comprobarlo y
 * responde 403.
 */
export function useOpcionesMenu(): readonly OpcionMenu[] {
  const { sesion } = useSesion();
  const tiene = usePermisos();
  const roles: readonly string[] =
    sesion.estado === 'autenticado' ? sesion.usuario.roles : [];
  return OPCIONES_MENU.filter((opcion) =>
    opcion.permiso
      ? tiene(opcion.permiso)
      : opcion.roles.some((rol) => roles.includes(rol)),
  );
}
