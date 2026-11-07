import { avisarSesionInvalida } from '@/sesion/eventos';
import { ErrorApi } from './cliente';

/** Mismo límite que las demás solicitudes a la API (src/api/cliente.ts). */
const TIEMPO_LIMITE_MS = 15_000;

/**
 * Descarga un archivo de la API (por ejemplo, un Excel de un reporte). Pasa por /api como todo
 * lo demás: el token sigue en la cookie httpOnly. Devuelve el archivo y el nombre que propone
 * el backend en `content-disposition`.
 */
export async function descargarArchivo(
  ruta: string,
  nombrePorDefecto: string,
): Promise<{ archivo: Blob; nombre: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch (error) {
    throw new ErrorApi(
      error instanceof DOMException && error.name === 'TimeoutError'
        ? 'El servidor de URAP tardó demasiado en responder. Intente de nuevo en unos minutos.'
        : 'No fue posible conectar con el servidor de URAP. Revise su conexión e intente de nuevo.',
    );
  }
  if (!respuesta.ok) {
    // Igual que el resto de solicitudes: con la sesión vencida, se vuelve al inicio de sesión.
    if (respuesta.status === 401) {
      avisarSesionInvalida();
    }
    const cuerpo: unknown = await respuesta.json().catch(() => undefined);
    const mensaje =
      typeof cuerpo === 'object' &&
      cuerpo !== null &&
      typeof (cuerpo as { mensaje?: unknown }).mensaje === 'string'
        ? (cuerpo as { mensaje: string }).mensaje
        : 'No fue posible generar el archivo. Intente de nuevo.';
    throw new ErrorApi(mensaje, respuesta.status);
  }
  const disposicion = respuesta.headers.get('content-disposition') ?? '';
  const nombre =
    /filename="([^"]+)"/.exec(disposicion)?.[1] ?? nombrePorDefecto;
  return { archivo: await respuesta.blob(), nombre };
}

/** Ofrece al navegador guardar el archivo descargado. */
export function guardarArchivo({
  archivo,
  nombre,
}: {
  archivo: Blob;
  nombre: string;
}): void {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
