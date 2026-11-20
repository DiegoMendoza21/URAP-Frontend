'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NOMBRE_APLICACION } from '@/app/identidad';
import { LogoUniversidad } from '@/componentes/LogoUniversidad';
import { useSesion } from '@/sesion/ProveedorSesion';
import { CampanaNotificaciones } from './CampanaNotificaciones';

export function EncabezadoPanel() {
  const { sesion, cerrar } = useSesion();
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  if (sesion.estado !== 'autenticado') {
    return null;
  }
  const { nombres, apellidos } = sesion.usuario;
  const nombreCompleto = [nombres, apellidos].filter(Boolean).join(' ');

  // HU-01-02: el servidor revoca la sesión y borra la cookie; luego se vuelve al inicio.
  async function cerrarSesion() {
    setSaliendo(true);
    await cerrar();
    router.replace('/iniciar-sesion');
  }

  return (
    <header className="border-b-4 border-acento bg-negro text-white print:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <span className="flex min-w-0 items-center gap-2">
          {/* Fondo blanco: el logo institucional no se pierde sobre el negro. */}
          <span className="flex shrink-0 rounded bg-white p-0.5 empty:hidden">
            <LogoUniversidad alto={28} />
          </span>
          <span className="text-lg font-bold">{NOMBRE_APLICACION}</span>
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <CampanaNotificaciones />
          {nombreCompleto && (
            <span className="hidden text-sm text-slate-200 sm:inline">
              {nombreCompleto}
            </span>
          )}
          <button
            type="button"
            onClick={cerrarSesion}
            disabled={saliendo}
            className="rounded-lg border border-white/60 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:opacity-60"
          >
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </header>
  );
}
