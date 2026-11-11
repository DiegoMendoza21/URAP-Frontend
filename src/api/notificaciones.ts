import { obtener, solicitar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

/*
 * Notificaciones dentro de la aplicación (RF-26; HU-13-01 y HU-13-03). Cada usuario tiene las
 * suyas: el backend no deja leer ni marcar las de otra persona.
 */

export type Notificacion = Esquemas['NotificacionDto'];
export type PaginaNotificaciones = Esquemas['PaginaNotificacionesDto'];
export type FiltroNotificaciones = 'todas' | 'no_leidas';

/**
 * Evento del navegador que avisa que cambió alguna notificación (se leyó una o todas), para
 * que la campana del encabezado vuelva a contar sin esperar a la siguiente consulta.
 */
export const EVENTO_NOTIFICACIONES = 'urap:notificaciones';

export function avisarCambioNotificaciones(): void {
  window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES));
}

export function consultarNotificaciones(
  filtro: FiltroNotificaciones,
  pagina: number,
  tamano: number,
  senal?: AbortSignal,
) {
  const consulta = new URLSearchParams({
    filtro,
    pagina: String(pagina),
    tamano: String(tamano),
  });
  return obtener<PaginaNotificaciones>(`/notificaciones?${consulta}`, {
    senal,
  });
}

export async function contarNoLeidas(senal?: AbortSignal): Promise<number> {
  const { noLeidas } = await obtener<Esquemas['ContadorNotificacionesDto']>(
    '/notificaciones/no-leidas',
    { senal },
  );
  return noLeidas;
}

export function marcarLeida(id: number) {
  return solicitar<Notificacion>(`/notificaciones/${id}/leida`, {
    metodo: 'PATCH',
  });
}

export function marcarTodasLeidas() {
  return solicitar<Esquemas['NotificacionesMarcadasDto']>(
    '/notificaciones/leidas',
    { metodo: 'PATCH' },
  );
}

/**
 * La ruta a la que lleva una notificación, solo si es de esta misma aplicación (empieza por
 * una sola barra). La guarda el backend, pero no se abre una dirección externa desde un aviso.
 */
export function destinoInterno(url: string | null): string | null {
  return url && /^\/(?!\/)/.test(url) ? url : null;
}
