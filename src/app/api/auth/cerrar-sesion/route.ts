import { NextResponse, type NextRequest } from 'next/server';
import { llamarBackend, manejarPeticion } from '@/servidor/backend';
import { borrarCookieSesion, COOKIE_SESION } from '@/servidor/cookie-sesion';

/**
 * Cierre de sesión (HU-01-02): el backend revoca la sesión y este route handler borra la
 * cookie. La cookie se borra aunque el backend no responda, para que el navegador quede sin
 * sesión de todos modos.
 */
export const POST = manejarPeticion(async (peticion: NextRequest) => {
  const token = peticion.cookies.get(COOKIE_SESION)?.value;
  if (token) {
    await llamarBackend(peticion, '/auth/cerrar-sesion', token).catch(
      () => undefined,
    );
  }
  const salida = new NextResponse(null, { status: 204 });
  borrarCookieSesion(salida);
  return salida;
});
