'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { contarNoLeidas, EVENTO_NOTIFICACIONES } from '@/api/notificaciones';

/** Cada cuánto se vuelve a contar mientras la pestaña está a la vista. */
const INTERVALO_MS = 60_000;

/**
 * Campana del encabezado con el número de notificaciones sin leer (RF-26; HU-13-01 y
 * HU-13-03). Cuenta al abrir el panel, cada minuto mientras la pestaña está a la vista, al
 * volver a la pestaña y cuando la bandeja avisa que se leyó alguna. No cuenta en cada cambio
 * de pantalla: serían peticiones de más. Si la consulta falla, conserva el último número: la
 * campana no es lugar para mostrar errores.
 */
export function CampanaNotificaciones() {
  const ruta = usePathname();
  const [noLeidas, setNoLeidas] = useState<number | null>(null);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    const otraVez = () => setVuelta((valor) => valor + 1);
    // Solo con la pestaña a la vista: al ocultarla, nadie vería el número.
    const siEstaVisible = () => {
      if (document.visibilityState === 'visible') {
        otraVez();
      }
    };
    const temporizador = setInterval(siEstaVisible, INTERVALO_MS);
    window.addEventListener(EVENTO_NOTIFICACIONES, otraVez);
    document.addEventListener('visibilitychange', siEstaVisible);
    return () => {
      clearInterval(temporizador);
      window.removeEventListener(EVENTO_NOTIFICACIONES, otraVez);
      document.removeEventListener('visibilitychange', siEstaVisible);
    };
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    contarNoLeidas(controlador.signal).then(setNoLeidas, () => undefined);
    return () => controlador.abort();
  }, [vuelta]);

  const hay = noLeidas !== null && noLeidas > 0;
  const etiqueta = !hay
    ? 'Notificaciones'
    : noLeidas === 1
      ? 'Notificaciones: 1 sin leer'
      : `Notificaciones: ${noLeidas} sin leer`;

  return (
    <Link
      href="/notificaciones"
      aria-label={etiqueta}
      aria-current={ruta === '/notificaciones' ? 'page' : undefined}
      className="relative inline-flex size-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6"
      >
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {hay && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs leading-5 font-bold text-white"
        >
          {noLeidas > 99 ? '99+' : noLeidas}
        </span>
      )}
    </Link>
  );
}
