import type { NextConfig } from 'next';
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from 'next/constants';

/**
 * Next.js incrusta la URL de la API en el código del navegador al compilar. Por eso `next dev`
 * y `next build` se detienen si falta o no es válida, en vez de producir una aplicación que no
 * puede hablar con el backend. `next start` no la revisa: usa la que quedó en la compilación.
 */
function verificarUrlApi(): void {
  const valor = process.env.NEXT_PUBLIC_URL_API;
  const url = valor ? URL.parse(valor) : null;
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new Error(
      'NEXT_PUBLIC_URL_API falta o no es una URL http(s) válida. Copie .env.example como ' +
        '.env.local y revise su valor (en local, http://localhost:3001/api).',
    );
  }
}

export default function configuracion(fase: string): NextConfig {
  if (fase === PHASE_DEVELOPMENT_SERVER || fase === PHASE_PRODUCTION_BUILD) {
    verificarUrlApi();
  }

  return {
    cacheComponents: true,
    partialPrefetching: true,
    turbopack: {
      rules: {
        // Turbopack procesa Tailwind CSS directamente, sin configuración de PostCSS.
        '*.css': {
          loaders: ['@tailwindcss/turbopack'],
          as: '*.css',
        },
      },
    },
  };
}
