import { NextResponse, type NextRequest } from 'next/server';
import type { SesionIniciada } from '@/api/autenticacion';
import type { components } from '@/api/openapi';
import {
  llamarBackend,
  manejarPeticion,
  respuestaParaNavegador,
} from '@/servidor/backend';
import { guardarCookieSesion } from '@/servidor/cookie-sesion';

type SesionDelBackend = components['schemas']['SesionIniciadaDto'];

/**
 * Inicio de sesión (HU-01-01). El backend valida las credenciales y emite el JWT; este route
 * handler lo guarda en la cookie httpOnly y le devuelve al navegador la sesión sin el token.
 */
export const POST = manejarPeticion(async (peticion: NextRequest) => {
  // Nunca se envía un token al iniciar sesión, aunque quede una cookie anterior.
  const respuesta = await llamarBackend(peticion, '/auth/iniciar-sesion');
  if (!respuesta.ok) {
    return respuestaParaNavegador(respuesta);
  }

  const { token, ...sesion } = (await respuesta.json()) as SesionDelBackend;
  const salida = NextResponse.json<SesionIniciada>(sesion);
  guardarCookieSesion(salida, token, new Date(sesion.expiraEn));
  return salida;
});
