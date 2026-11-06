import type { NextResponse } from 'next/server';

/**
 * Cookie donde el servidor de Next guarda el JWT de la sesión. Es `httpOnly`: el navegador la
 * envía sola en cada petición a este origen, pero ningún JavaScript de la página la puede leer.
 */
export const COOKIE_SESION = 'urap_sesion';

function opcionesCookie() {
  return {
    httpOnly: true,
    // Lax: el navegador no la envía en peticiones POST que vengan de otros sitios (CSRF).
    sameSite: 'lax' as const,
    // En producción solo viaja por HTTPS (NFR-006); en local se trabaja con http://localhost.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/** La cookie vence junto con el token (NFR-003: ocho horas). */
export function guardarCookieSesion(
  respuesta: NextResponse,
  token: string,
  expiraEn: Date,
): void {
  respuesta.cookies.set(COOKIE_SESION, token, {
    ...opcionesCookie(),
    expires: expiraEn,
  });
}

export function borrarCookieSesion(respuesta: NextResponse): void {
  respuesta.cookies.set(COOKIE_SESION, '', { ...opcionesCookie(), maxAge: 0 });
}
