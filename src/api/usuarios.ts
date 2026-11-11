import { enviar, obtener, solicitar } from './cliente';
import type { components } from './openapi';

type Esquemas = components['schemas'];

export type Usuario = Esquemas['UsuarioDto'];
export type DetalleUsuario = Esquemas['DetalleUsuarioDto'];
export type PaginaUsuarios = Esquemas['PaginaUsuariosDto'];
export type RolVigente = Esquemas['RolVigenteDto'];
export type OpcionesUsuarios = Esquemas['OpcionesUsuariosDto'];
export type UsuarioCreado = Esquemas['UsuarioCreadoDto'];
export type ContrasenaTemporal = Esquemas['ContrasenaTemporalDto'];
export type DatosNuevoUsuario = Esquemas['CrearUsuarioDto'];
export type CambiosUsuario = Esquemas['EditarUsuarioDto'];
export type EventoRol = Esquemas['EventoRolDto'];
export type HistorialRoles = Esquemas['HistorialRolesDto'];
export type RolPorAsignar = Esquemas['RolParaAsignarDto'];
export type EstadoUsuario = 'activo' | 'inactivo';

/*
 * Gestión de usuarios (RF-02). Consulta quien tiene `usuarios.leer` (el Administrador, el
 * Departamento y la Dirección); crea, edita, inactiva y genera contraseñas quien tiene
 * `usuarios.administrar` (el Administrador). El backend lo comprueba en cada petición.
 */

/** Permisos de la matriz que deciden qué muestra la pantalla. Es solo presentación. */
export const PERMISO_CONSULTAR_USUARIOS = 'usuarios.leer';
export const PERMISO_ADMINISTRAR_USUARIOS = 'usuarios.administrar';

export interface FiltroUsuarios {
  idPrograma?: number;
  idRol?: number;
  estado?: EstadoUsuario;
  /** Parte del nombre, de los apellidos o del correo. */
  buscar?: string;
}

export function consultarUsuarios(
  filtro: FiltroUsuarios,
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
  return obtener<PaginaUsuarios>(`/usuarios?${consulta}`, { senal });
}

export function consultarOpcionesUsuarios(senal?: AbortSignal) {
  return obtener<OpcionesUsuarios>('/usuarios/opciones', { senal });
}

export function consultarUsuario(id: number, senal?: AbortSignal) {
  return obtener<DetalleUsuario>(`/usuarios/${id}`, { senal });
}

/** La respuesta trae la contraseña temporal, que el backend no vuelve a entregar. */
export function crearUsuario(datos: DatosNuevoUsuario) {
  return enviar<UsuarioCreado>('/usuarios', datos);
}

export function editarUsuario(id: number, cambios: CambiosUsuario) {
  return solicitar<DetalleUsuario>(`/usuarios/${id}`, {
    metodo: 'PATCH',
    cuerpo: cambios,
  });
}

export function cambiarEstadoUsuario(id: number, activo: boolean) {
  return solicitar<DetalleUsuario>(`/usuarios/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { activo },
  });
}

export function generarContrasenaTemporal(id: number) {
  return enviar<ContrasenaTemporal>(`/usuarios/${id}/contrasena-temporal`);
}

/** HU-02-07: asigna un rol sobre un programa; sin programa, sobre todos. */
export function asignarRol(id: number, rol: RolPorAsignar) {
  return enviar<DetalleUsuario>(`/usuarios/${id}/roles`, rol);
}

/** HU-02-07: revocación lógica; el rol queda en el historial. */
export function revocarRol(id: number, idAsignacion: number) {
  return solicitar<DetalleUsuario>(`/usuarios/${id}/roles/${idAsignacion}`, {
    metodo: 'DELETE',
  });
}

export function consultarHistorialRoles(id: number, senal?: AbortSignal) {
  return obtener<HistorialRoles>(`/usuarios/${id}/roles/historial`, { senal });
}

export function nombreCompleto(
  usuario: Pick<Usuario, 'nombres' | 'apellidos'>,
) {
  return `${usuario.nombres} ${usuario.apellidos}`.trim();
}

/** «Docente responsable · Administración Industrial», o «… · Todos los programas». */
export function textoRol(rol: Pick<RolVigente, 'rol' | 'programa'>): string {
  return `${rol.rol} · ${rol.programa ?? 'Todos los programas'}`;
}
