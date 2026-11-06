import { enviar, obtener } from './cliente';
import type { components } from './openapi';

export type UsuarioAutenticado = components['schemas']['UsuarioAutenticadoDto'];
export type DatosInicioSesion = components['schemas']['IniciarSesionDto'];

/**
 * Lo que devuelve el servidor de Next al iniciar sesión: la respuesta del backend sin el
 * token, que queda en la cookie httpOnly (ver src/app/api/auth/iniciar-sesion/route.ts).
 */
export type SesionIniciada = Omit<
  components['schemas']['SesionIniciadaDto'],
  'token'
>;

/** HU-01-01. Un 401 aquí es un error de credenciales, no una sesión vencida. */
export function iniciarSesion(
  datos: DatosInicioSesion,
): Promise<SesionIniciada> {
  return enviar<SesionIniciada>('/auth/iniciar-sesion', datos, {
    publica: true,
  });
}

/** Usuario de la sesión actual, con sus roles vigentes. Responde 401 si no hay sesión válida. */
export function consultarSesion(
  senal?: AbortSignal,
): Promise<UsuarioAutenticado> {
  return obtener<UsuarioAutenticado>('/auth/sesion', { senal });
}

/** HU-01-02. Revoca la sesión en el backend y borra la cookie. */
export function cerrarSesion(): Promise<void> {
  return enviar<void>('/auth/cerrar-sesion');
}
