import { useSyncExternalStore } from 'react';

/*
 * La última consulta del listado (sus filtros y su página), para que «← Auditoría» en el
 * detalle vuelva a ella y no a la lista sin filtros. Vive en la pestaña (`sessionStorage`) y
 * no guarda nada más que la dirección que ya se veía en la barra del navegador.
 */

const CLAVE = 'urap:auditoria:consulta';

export function guardarConsulta(direccion: string): void {
  try {
    sessionStorage.setItem(CLAVE, direccion);
  } catch {
    // Sin almacenamiento (modo privado estricto): el enlace vuelve a la lista sin filtros.
  }
}

function leer(): string {
  try {
    return sessionStorage.getItem(CLAVE) ?? '';
  } catch {
    return '';
  }
}

const sinCambios = () => () => undefined;

/** Dirección del listado al que vuelve el detalle. */
export function useRutaListado(): string {
  const consulta = useSyncExternalStore(sinCambios, leer, () => '');
  return consulta ? `/auditoria?${consulta}` : '/auditoria';
}
