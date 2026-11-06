import type { NextRequest } from 'next/server';
import {
  llamarBackend,
  manejarPeticion,
  respuestaError,
  respuestaParaNavegador,
} from '@/servidor/backend';
import { borrarCookieSesion, COOKIE_SESION } from '@/servidor/cookie-sesion';

/**
 * Reenvía al backend cualquier petición a /api/... con el token de la cookie de sesión. Las
 * rutas son las mismas del backend, así que los tipos generados desde su OpenAPI aplican tal
 * cual. Iniciar y cerrar sesión tienen sus propios route handlers, que manejan la cookie.
 */
const reenviar = manejarPeticion(
  async (peticion: NextRequest, contexto: RouteContext<'/api/[...ruta]'>) => {
    const { ruta } = await contexto.params;
    if (ruta.some((segmento) => segmento === '.' || segmento === '..')) {
      return respuestaError(
        peticion,
        404,
        'No encontrado',
        'El recurso solicitado no existe.',
      );
    }
    const token = peticion.cookies.get(COOKIE_SESION)?.value;
    const respuesta = respuestaParaNavegador(
      await llamarBackend(
        peticion,
        `/${ruta.map(encodeURIComponent).join('/')}`,
        token,
      ),
    );
    // El backend ya no acepta el token (vencido, revocado o usuario inactivo): se borra la cookie.
    if (respuesta.status === 401 && token) {
      borrarCookieSesion(respuesta);
    }
    return respuesta;
  },
);

export const GET = reenviar;
export const POST = reenviar;
export const PUT = reenviar;
export const PATCH = reenviar;
export const DELETE = reenviar;
