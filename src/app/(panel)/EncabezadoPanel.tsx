'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NOMBRE_APLICACION } from '@/app/identidad';
import { useSesion } from '@/sesion/ProveedorSesion';

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
    <header className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <span className="text-lg font-bold text-marca">
          {NOMBRE_APLICACION}
        </span>
        <div className="flex items-center gap-3">
          {nombreCompleto && (
            <span className="hidden text-sm text-slate-700 sm:inline">
              {nombreCompleto}
            </span>
          )}
          <button
            type="button"
            onClick={cerrarSesion}
            disabled={saliendo}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-60"
          >
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </header>
  );
}
