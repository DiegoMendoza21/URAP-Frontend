import { obtener } from './cliente';
import type { components } from './openapi';

/** Respuesta de GET /api/salud cuando la API y su base de datos responden. */
export type EstadoSalud = components['schemas']['EstadoSaludDto'];

/** Verifica que la API y su base de datos respondan. Es público: no necesita sesión. */
export function consultarSalud(senal?: AbortSignal): Promise<EstadoSalud> {
  return obtener<EstadoSalud>('/salud', { senal, publica: true });
}
