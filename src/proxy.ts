import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESION } from '@/servidor/cookie-sesion';

/** Páginas que se pueden ver sin sesión. Todas las demás la exigen. */
const PAGINAS_PUBLICAS = new Set(['/iniciar-sesion']);

/**
 * Redirección temprana según exista o no la cookie de sesión, para no mostrar una página
 * protegida a quien no ha iniciado sesión. Es solo presentación: el backend valida el token en
 * cada petición, y la página vuelve a comprobar la sesión al cargar.
 */
export function proxy(peticion: NextRequest) {
  const conSesion = peticion.cookies.has(COOKIE_SESION);
  const publica = PAGINAS_PUBLICAS.has(peticion.nextUrl.pathname);
  if (!conSesion && !publica) {
    return NextResponse.redirect(new URL('/iniciar-sesion', peticion.url));
  }
  if (conSesion && publica) {
    return NextResponse.redirect(new URL('/', peticion.url));
  }
  return NextResponse.next();
}

export const config = {
  // Solo páginas: quedan fuera la API, los archivos de Next, el manifiesto y los íconos.
  matcher: [
    '/((?!api/|_next/|manifest.webmanifest|icon.svg|apple-icon.png|iconos/|favicon.ico).*)',
  ],
};
