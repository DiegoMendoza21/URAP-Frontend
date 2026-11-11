import { obtener } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type RegistroAuditoria = Esquemas['RegistroAuditoriaDto'];
export type DetalleAuditoria = Esquemas['DetalleAuditoriaDto'];
export type PaginaAuditoria = Esquemas['PaginaAuditoriaDto'];
export type AccionAuditoria = RegistroAuditoria['accion'];

/*
 * Consulta de la auditoría (RF-29, p4; HU-14-02 y HU-14-03). Es la consulta completa: el
 * backend solo la entrega a quien tiene `auditoria.administrar` (el Administrador). Solo hay
 * lecturas: los registros no se modifican ni se eliminan.
 */

export interface FiltroAuditoria {
  /** Primer día del rango, `AAAA-MM-DD`. */
  desde?: string;
  /** Último día del rango, incluido, `AAAA-MM-DD`. */
  hasta?: string;
  /** Parte del nombre o del correo de quien hizo la acción. */
  usuario?: string;
  accion?: AccionAuditoria;
  /** Código de la entidad, como llega en cada registro. */
  entidad?: string;
  /** Con `entidad`: el historial completo de ese registro (HU-14-03). */
  idRegistro?: number;
}

export function consultarAuditoria(
  filtro: FiltroAuditoria,
  pagina: number,
  tamano: number,
  senal?: AbortSignal,
) {
  const consulta = new URLSearchParams({
    pagina: String(pagina),
    tamano: String(tamano),
  });
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== undefined && valor !== '') {
      consulta.set(clave, String(valor));
    }
  }
  return obtener<PaginaAuditoria>(`/auditoria?${consulta}`, { senal });
}

export function consultarRegistroAuditoria(id: number, senal?: AbortSignal) {
  return obtener<DetalleAuditoria>(`/auditoria/${id}`, { senal });
}
