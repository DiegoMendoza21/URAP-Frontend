'use client';

import { useSesion } from './ProveedorSesion';

/**
 * Un permiso de la matriz como lo devuelve el backend (HU-01-03): `modulo.permiso`, por
 * ejemplo `proyectos.crear`. El backend envía la unión de los permisos de todos los roles del
 * usuario, así que un docente que además es líder RAP ve las opciones de los dos.
 */
export type ClavePermiso = `${string}.${string}`;

/**
 * Si el usuario de la sesión tiene el permiso. Es solo presentación: sirve para armar el menú
 * y ocultar acciones. El backend vuelve a comprobarlo en cada petición y responde 403.
 */
export function usePermisos(): (permiso: ClavePermiso) => boolean {
  const { sesion } = useSesion();
  const permisos =
    sesion.estado === 'autenticado' ? sesion.usuario.permisos : [];
  return (permiso) => permisos.includes(permiso);
}
