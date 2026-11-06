'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSesion } from './ProveedorSesion';

/**
 * Muestra su contenido solo con una sesión válida; sin ella, lleva al inicio de sesión. Es
 * presentación: los datos de cada pantalla los protege el backend.
 */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { sesion, verificar } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (sesion.estado === 'verificando') {
      verificar();
    }
  }, [sesion.estado, verificar]);

  useEffect(() => {
    if (sesion.estado === 'anonimo') {
      router.replace('/iniciar-sesion');
    }
  }, [sesion.estado, router]);

  if (sesion.estado === 'autenticado') {
    return children;
  }

  if (sesion.estado === 'sin-conexion') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <div role="alert" className="space-y-1">
          <p className="font-semibold">No fue posible verificar su sesión.</p>
          <p className="text-sm text-slate-700">{sesion.mensaje}</p>
        </div>
        <button
          type="button"
          onClick={verificar}
          className="rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <p
      role="status"
      className="flex min-h-dvh items-center justify-center px-4 text-slate-600"
    >
      Verificando su sesión…
    </p>
  );
}
