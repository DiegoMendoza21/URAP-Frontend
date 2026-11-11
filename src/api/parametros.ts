import { obtener, solicitar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

/*
 * Parámetros del sistema (HU-03-07). El backend decide quién los administra (el permiso
 * `estructura.administrar` de la matriz), cuáles existen y qué valor admite cada uno: aquí solo
 * se presentan y se envía el valor nuevo.
 */

export type Parametro = Esquemas['ParametroDto'];
export type CambioParametro = Esquemas['CambiarParametroDto'];

/** El permiso de la matriz con que el backend protege la consulta y la edición. */
export const PERMISO_PARAMETROS = 'estructura.administrar';

export async function consultarParametros(
  senal?: AbortSignal,
): Promise<Parametro[]> {
  const { elementos } = await obtener<Esquemas['ListaParametrosDto']>(
    '/parametros',
    { senal },
  );
  return elementos;
}

/** Cambia el valor. Rige desde la siguiente petición y queda en la auditoría. */
export function cambiarParametro(clave: string, cambio: CambioParametro) {
  return solicitar<Parametro>(`/parametros/${encodeURIComponent(clave)}`, {
    metodo: 'PATCH',
    cuerpo: cambio,
  });
}
