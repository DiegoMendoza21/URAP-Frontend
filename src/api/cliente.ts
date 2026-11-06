import type { components } from './openapi';

/** Cuerpo de toda respuesta de error de la API (RespuestaErrorDto en el backend). */
export type RespuestaError = components['schemas']['RespuestaErrorDto'];

/** URL base de la API, sin barra final. Next.js la incrusta al compilar (ver .env.example). */
const URL_API = (process.env.NEXT_PUBLIC_URL_API ?? '').replace(/\/+$/, '');

/**
 * Tiempo máximo de espera antes de dar por fallida una solicitud. Deja margen sobre los 10 s
 * que tarda el backend en responder cuando la base de datos no contesta, para que llegue su
 * propio mensaje de error.
 */
const TIEMPO_LIMITE_MS = 15_000;

const MENSAJES = {
  sinConexion:
    'No fue posible conectar con el servidor de URAP. Revise su conexión e intente de nuevo.',
  tiempoAgotado:
    'El servidor de URAP tardó demasiado en responder. Intente de nuevo en unos minutos.',
  servidorNoDisponible:
    'El servidor de URAP no está disponible en este momento. Intente de nuevo más tarde.',
  solicitudRechazada: 'No fue posible completar la solicitud.',
  inesperado: 'Ocurrió un error inesperado. Intente de nuevo más tarde.',
} as const;

/**
 * Falla de una solicitud a la API. Su `message` está en español y se puede mostrar al usuario.
 * `estado` es el código HTTP cuando el servidor alcanzó a responder.
 */
export class ErrorApi extends Error {
  readonly estado?: number;
  readonly detalles?: string[];

  constructor(mensaje: string, estado?: number, detalles?: string[]) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.detalles = detalles;
  }
}

/**
 * GET a la API. Devuelve el cuerpo JSON, que el llamador tipa con los tipos generados desde
 * el OpenAPI, o lanza ErrorApi. Si `senal` cancela la solicitud, se propaga su motivo.
 */
export async function obtener<T>(
  ruta: string,
  senal?: AbortSignal,
): Promise<T> {
  senal?.throwIfAborted();
  const controlador = new AbortController();
  const cancelar = () => controlador.abort(senal?.reason);
  senal?.addEventListener('abort', cancelar, { once: true });
  let tiempoAgotado = false;
  const temporizador = setTimeout(() => {
    tiempoAgotado = true;
    controlador.abort();
  }, TIEMPO_LIMITE_MS);

  try {
    const respuesta = await fetch(`${URL_API}${ruta}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controlador.signal,
    });
    const cuerpo: unknown = await respuesta.json().catch(() => undefined);
    senal?.throwIfAborted();
    if (tiempoAgotado) {
      throw new ErrorApi(MENSAJES.tiempoAgotado);
    }
    if (!respuesta.ok) {
      throw errorDeRespuesta(respuesta.status, cuerpo);
    }
    if (cuerpo === undefined) {
      throw new ErrorApi(MENSAJES.inesperado, respuesta.status);
    }
    return cuerpo as T;
  } catch (error) {
    if (error instanceof ErrorApi || senal?.aborted) {
      throw error;
    }
    // fetch solo falla cuando no hubo respuesta: red caída, origen rechazado por CORS o
    // tiempo agotado.
    throw new ErrorApi(
      tiempoAgotado ? MENSAJES.tiempoAgotado : MENSAJES.sinConexion,
    );
  } finally {
    clearTimeout(temporizador);
    senal?.removeEventListener('abort', cancelar);
  }
}

/** Mensaje en español para el usuario ante cualquier error, sin detalles técnicos (NFR-011). */
export function mensajeParaUsuario(error: unknown): string {
  return error instanceof ErrorApi ? error.message : MENSAJES.inesperado;
}

/**
 * Con un cuerpo de la forma de RespuestaErrorDto se usa el mensaje del backend, que ya viene
 * en español y apto para el usuario. Con cualquier otro (por ejemplo, la página de error de
 * un proxy) se usa un mensaje genérico.
 */
function errorDeRespuesta(estado: number, cuerpo: unknown): ErrorApi {
  if (esRespuestaError(cuerpo)) {
    const detalles = Array.isArray(cuerpo.detalles)
      ? cuerpo.detalles.filter((detalle) => typeof detalle === 'string')
      : undefined;
    return new ErrorApi(cuerpo.mensaje, estado, detalles);
  }
  return new ErrorApi(
    estado >= 500 ? MENSAJES.servidorNoDisponible : MENSAJES.solicitudRechazada,
    estado,
  );
}

function esRespuestaError(cuerpo: unknown): cuerpo is RespuestaError {
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return false;
  }
  const { estado, mensaje } = cuerpo as Record<string, unknown>;
  return typeof estado === 'number' && typeof mensaje === 'string';
}
