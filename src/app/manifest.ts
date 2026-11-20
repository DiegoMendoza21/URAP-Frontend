import type { MetadataRoute } from 'next';
import {
  COLOR_FONDO,
  COLOR_NEGRO,
  DESCRIPCION_APLICACION,
  NOMBRE_APLICACION,
} from './identidad';

/**
 * Manifiesto de la aplicación web (NFR-014): permite instalar URAP en el teléfono o en el
 * computador. Los colores son los de la Universidad (NFR-018); los íconos siguen siendo
 * provisionales hasta que exista un logo propio de URAP.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${NOMBRE_APLICACION} · Seguimiento de proyectos docentes`,
    short_name: NOMBRE_APLICACION,
    description: DESCRIPCION_APLICACION,
    lang: 'es-CO',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: COLOR_FONDO,
    theme_color: COLOR_NEGRO,
    icons: [
      { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/iconos/icono-adaptable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
