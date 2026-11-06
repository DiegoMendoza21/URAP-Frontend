import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { components } from '@/api/openapi';

type RespuestaError = components['schemas']['RespuestaErrorDto'];

/*
 * El navegador no habla con el backend: llama a /api en este mismo origen, y el servidor de
 * Next reenvía cada petición al backend con el token de la sesión, que guarda en una cookie
 * httpOnly (ver cookie-sesion.ts). Así el token nunca queda al alcance del JavaScript de la
 * página. Este módulo solo puede importarse desde código del servidor.
 */

/** Menor que la espera del navegador (15 s), para que llegue el mensaje de este servidor. */
const TIEMPO_LIMITE_MS = 12_000;

/** Cabeceras del navegador que el backend necesita. Las demás, incluidas las cookies, no pasan. */
const CABECERAS_DE_PETICION = [
  'accept',
  'accept-language',
  'content-type',
  'user-agent',
  'x-forwarded-for',
];

/** Cabeceras de la respuesta del backend que se devuelven al navegador. */
const CABECERAS_DE_RESPUESTA = [
  'content-type',
  'content-disposition',
  'cache-control',
  'etag',
  'last-modified',
];

const MENSAJE_SIN_BACKEND =
  'No fue posible conectar con el servidor de URAP. Intente de nuevo en unos minutos.';
const MENSAJE_TIEMPO_AGOTADO =
  'El servidor de URAP tardó demasiado en responder. Intente de nuevo en unos minutos.';
const MENSAJE_OTRO_ORIGEN = 'No tiene permiso para realizar esta acción.';

/** El backend no respondió; `manejarPeticion` lo convierte en un 502 o un 504 en español. */
class BackendSinRespuesta extends Error {
  readonly estado: number;

  constructor(tiempoAgotado: boolean) {
    super(tiempoAgotado ? MENSAJE_TIEMPO_AGOTADO : MENSAJE_SIN_BACKEND);
    this.estado = tiempoAgotado ? 504 : 502;
  }
}

/**
 * Envía al backend la petición del navegador hacia `ruta` (sin el prefijo /api), con el token
 * de la sesión si lo hay. Devuelve la respuesta del backend tal cual, sea cual sea su estado.
 */
export async function llamarBackend(
  peticion: NextRequest,
  ruta: string,
  token?: string,
): Promise<Response> {
  const cabeceras = new Headers();
  for (const nombre of CABECERAS_DE_PETICION) {
    const valor = peticion.headers.get(nombre);
    if (valor) {
      cabeceras.set(nombre, valor);
    }
  }
  if (token) {
    cabeceras.set('authorization', `Bearer ${token}`);
  }
  const conCuerpo = peticion.method !== 'GET' && peticion.method !== 'HEAD';
  const base = (process.env.URL_API ?? '').replace(/\/+$/, '');

  try {
    return await fetch(`${base}${ruta}${peticion.nextUrl.search}`, {
      method: peticion.method,
      headers: cabeceras,
      body: conCuerpo ? await peticion.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch (error) {
    throw new BackendSinRespuesta(
      error instanceof DOMException && error.name === 'TimeoutError',
    );
  }
}

/** Copia la respuesta del backend para el navegador, sin sus cabeceras internas. */
export function respuestaParaNavegador(respuesta: Response): NextResponse {
  const cabeceras = new Headers();
  for (const nombre of CABECERAS_DE_RESPUESTA) {
    const valor = respuesta.headers.get(nombre);
    if (valor) {
      cabeceras.set(nombre, valor);
    }
  }
  const sinCuerpo = respuesta.status === 204 || respuesta.status === 304;
  return new NextResponse(sinCuerpo ? null : respuesta.body, {
    status: respuesta.status,
    headers: cabeceras,
  });
}

/**
 * Envuelve un route handler: rechaza las escrituras que no vengan de esta misma aplicación y
 * convierte la falta de respuesta del backend en un error con la forma de RespuestaErrorDto.
 */
export function manejarPeticion<Resto extends unknown[]>(
  manejador: (peticion: NextRequest, ...resto: Resto) => Promise<NextResponse>,
) {
  return async (
    peticion: NextRequest,
    ...resto: Resto
  ): Promise<NextResponse> => {
    if (!vieneDeEsteOrigen(peticion)) {
      return respuestaError(
        peticion,
        403,
        'Acceso denegado',
        MENSAJE_OTRO_ORIGEN,
      );
    }
    try {
      return await manejador(peticion, ...resto);
    } catch (error) {
      if (error instanceof BackendSinRespuesta) {
        return respuestaError(
          peticion,
          error.estado,
          'Servicio no disponible',
          error.message,
        );
      }
      throw error;
    }
  };
}

export function respuestaError(
  peticion: NextRequest,
  estado: number,
  error: string,
  mensaje: string,
): NextResponse {
  const cuerpo: RespuestaError = {
    estado,
    error,
    mensaje,
    ruta: peticion.nextUrl.pathname,
    fecha: new Date().toISOString(),
  };
  return NextResponse.json(cuerpo, { status: estado });
}

/**
 * Defensa contra CSRF además de SameSite=Lax: una petición que cambia datos solo se acepta si
 * el navegador indica que viene de este mismo origen. Los clientes que no son navegadores no
 * envían estas cabeceras, pero tampoco tienen la cookie de sesión de nadie.
 */
function vieneDeEsteOrigen(peticion: NextRequest): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(peticion.method)) {
    return true;
  }
  const sitio = peticion.headers.get('sec-fetch-site');
  if (sitio) {
    return sitio === 'same-origin';
  }
  const origen = peticion.headers.get('origin');
  if (!origen) {
    return true;
  }
  const anfitrion =
    peticion.headers.get('x-forwarded-host') ?? peticion.headers.get('host');
  return URL.parse(origen)?.host === anfitrion;
}
