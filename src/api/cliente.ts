import { avisarSesionInvalida } from '@/sesion/eventos';
import type { components } from './openapi';

/** Cuerpo de toda respuesta de error de la API (RespuestaErrorDto en el backend). */
export type RespuestaError = components['schemas']['RespuestaErrorDto'];

/**
 * El navegador llama a /api en este mismo origen, con las mismas rutas del backend: el
 * servidor de Next reenvía cada petición con el token de la sesión, que guarda en una cookie
 * httpOnly (ver src/servidor/backend.ts). Aquí nunca se maneja el token.
 */
const URL_API = '/api';

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
  demasiadosIntentos:
    'Se hicieron demasiados intentos. Espere un momento e intente de nuevo.',
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

export interface OpcionesSolicitud {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Se envía como JSON. */
  cuerpo?: unknown;
  /**
   * Se envía como multipart/form-data, para cargar archivos. El navegador pone el
   * Content-Type con su separador; no se debe fijar a mano.
   */
  formulario?: FormData;
  /** Si `senal` cancela la solicitud, se propaga su motivo en vez de un ErrorApi. */
  senal?: AbortSignal;
  /**
   * La ruta no exige sesión (iniciar sesión, salud): un 401 en ella no significa que la
   * sesión venció.
   */
  publica?: boolean;
}

/**
 * Solicitud a la API. Devuelve el cuerpo JSON, que el llamador tipa con los tipos generados
 * desde el OpenAPI, o `undefined` si la respuesta no tiene cuerpo (204). Si falla, lanza
 * ErrorApi con un mensaje en español.
 */
export async function solicitar<T>(
  ruta: string,
  {
    metodo = 'GET',
    cuerpo,
    formulario,
    senal,
    publica = false,
  }: OpcionesSolicitud = {},
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
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body:
        formulario ??
        (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)),
      cache: 'no-store',
      signal: controlador.signal,
    });
    const sinCuerpo = respuesta.status === 204;
    const datos: unknown = sinCuerpo
      ? undefined
      : await respuesta.json().catch(() => undefined);
    senal?.throwIfAborted();
    if (tiempoAgotado) {
      throw new ErrorApi(MENSAJES.tiempoAgotado);
    }
    if (!respuesta.ok) {
      if (respuesta.status === 401 && !publica) {
        avisarSesionInvalida();
      }
      throw errorDeRespuesta(respuesta.status, datos);
    }
    if (datos === undefined && !sinCuerpo) {
      throw new ErrorApi(MENSAJES.inesperado, respuesta.status);
    }
    return datos as T;
  } catch (error) {
    if (error instanceof ErrorApi || senal?.aborted) {
      throw error;
    }
    // fetch solo falla cuando no hubo respuesta: red caída o tiempo agotado.
    throw new ErrorApi(
      tiempoAgotado ? MENSAJES.tiempoAgotado : MENSAJES.sinConexion,
    );
  } finally {
    clearTimeout(temporizador);
    senal?.removeEventListener('abort', cancelar);
  }
}

/** GET a la API (ver `solicitar`). */
export function obtener<T>(
  ruta: string,
  opciones: Omit<OpcionesSolicitud, 'metodo' | 'cuerpo'> = {},
): Promise<T> {
  return solicitar<T>(ruta, opciones);
}

/** POST a la API con un cuerpo JSON opcional (ver `solicitar`). */
export function enviar<T>(
  ruta: string,
  cuerpo?: unknown,
  opciones: Omit<OpcionesSolicitud, 'metodo' | 'cuerpo'> = {},
): Promise<T> {
  return solicitar<T>(ruta, { ...opciones, metodo: 'POST', cuerpo });
}

/** PUT a la API con un cuerpo JSON: reemplaza lo enviado (ver `solicitar`). */
export function reemplazar<T>(
  ruta: string,
  cuerpo: unknown,
  opciones: Omit<OpcionesSolicitud, 'metodo' | 'cuerpo'> = {},
): Promise<T> {
  return solicitar<T>(ruta, { ...opciones, metodo: 'PUT', cuerpo });
}

/** POST a la API con un formulario multipart, para cargar archivos (ver `solicitar`). */
export function enviarFormulario<T>(
  ruta: string,
  formulario: FormData,
  opciones: Omit<OpcionesSolicitud, 'metodo' | 'cuerpo' | 'formulario'> = {},
): Promise<T> {
  return solicitar<T>(ruta, { ...opciones, metodo: 'POST', formulario });
}

/** Mensaje en español para el usuario ante cualquier error, sin detalles técnicos (NFR-011). */
export function mensajeParaUsuario(error: unknown): string {
  return error instanceof ErrorApi ? error.message : MENSAJES.inesperado;
}

/**
 * Con un cuerpo de la forma de RespuestaErrorDto se usa el mensaje del backend, que ya viene
 * en español y apto para el usuario. Con cualquier otro (por ejemplo, la página de error de
 * un proxy) se usa un mensaje genérico. Un 429 sin ese cuerpo viene de algo delante del
 * backend (un balanceador o un firewall), y su mensaje dice que hay que esperar.
 */
function errorDeRespuesta(estado: number, cuerpo: unknown): ErrorApi {
  if (esRespuestaError(cuerpo)) {
    const detalles = Array.isArray(cuerpo.detalles)
      ? cuerpo.detalles.filter((detalle) => typeof detalle === 'string')
      : undefined;
    return new ErrorApi(cuerpo.mensaje, estado, detalles);
  }
  if (estado === 429) {
    return new ErrorApi(MENSAJES.demasiadosIntentos, estado);
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
