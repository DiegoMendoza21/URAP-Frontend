import type { ClavePermiso } from '@/sesion/permisos';

export interface OpcionMenu {
  ruta: string;
  etiqueta: string;
  /** Lo que el usuario hace allí, para la tarjeta del panel inicial. */
  descripcion: string;
  /** Permiso de la matriz que habilita la opción (HU-01-03). */
  permiso: ClavePermiso;
}

/**
 * Opciones del menú del panel, en su orden. Cada pantalla nueva agrega aquí su opción con el
 * permiso de la matriz que la habilita: el menú no mira el nombre de los roles, así que
 * también funciona con los roles que cree el administrador (HU-02-05).
 */
export const OPCIONES_MENU: readonly OpcionMenu[] = [
  {
    ruta: '/proyectos-docentes',
    etiqueta: 'Proyectos docentes',
    descripcion: 'Consulte los proyectos docentes a su cargo.',
    permiso: 'proyectos.leer',
  },
];
