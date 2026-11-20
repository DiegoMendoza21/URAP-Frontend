'use client';

import Image from 'next/image';
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
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Image
          src="/marca/urap-logo-oscuro.svg"
          alt={NOMBRE_APLICACION}
          width={101}
          height={32}
          unoptimized
          className="h-8 w-auto shrink-0"
        />
        <div className="flex items-center gap-2 sm:gap-3">
          {/* El escudo de la Universidad, aparte y sobre blanco: su texto es negro. En el
              teléfono no cabe junto a la campana y «Cerrar sesión»; queda en el inicio de sesión. */}
          <span className="mr-1 hidden shrink-0 rounded-md bg-white px-1.5 py-0.5 empty:hidden sm:flex">
            <LogoUniversidad alto={30} />
          </span>
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
