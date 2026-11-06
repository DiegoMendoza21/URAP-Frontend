import type { NextConfig } from 'next';
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants';

/**
 * El servidor de Next reenvía al backend cada petición del navegador a /api (ver
 * src/servidor/backend.ts), así que `next dev` y `next start` se detienen si la URL del
 * backend falta o no es válida. `next build` no la necesita: se lee al atender cada petición.
 */
function verificarUrlApi(): void {
  const valor = process.env.URL_API;
  const url = valor ? URL.parse(valor) : null;
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new Error(
      'URL_API falta o no es una URL http(s) válida. Copie .env.example como .env.local y ' +
        'revise su valor (en local, http://localhost:3001/api).',
    );
  }
}

export default function configuracion(fase: string): NextConfig {
  if (fase === PHASE_DEVELOPMENT_SERVER || fase === PHASE_PRODUCTION_SERVER) {
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
