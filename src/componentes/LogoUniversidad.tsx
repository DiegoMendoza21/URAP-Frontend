'use client';

import Image from 'next/image';
import { createContext, useContext, type ReactNode } from 'react';

/** La ruta del logo, que el diseño raíz averigua en el servidor (`rutaLogoUniversidad`). */
const ContextoLogo = createContext<string | null>(null);

export function ProveedorLogo({
  ruta,
  children,
}: {
  ruta: string | null;
  children: ReactNode;
}) {
  return <ContextoLogo value={ruta}>{children}</ContextoLogo>;
}

/**
 * Logo de la Universidad de Cartagena (NFR-018) a la altura pedida, con su ancho natural. Si el
 * archivo no está en `public/marca/`, no se pinta nada: quien lo use no debe reservarle espacio.
 */
export function LogoUniversidad({
  alto,
  className = '',
}: {
  /** Alto en píxeles. */
  alto: number;
  className?: string;
}) {
  const ruta = useContext(ContextoLogo);
  if (!ruta) {
    return null;
  }
  return (
    <Image
      src={ruta}
      alt="Universidad de Cartagena"
      width={alto * 4}
      height={alto}
      unoptimized
      className={`w-auto ${className}`}
      style={{ height: alto }}
    />
  );
}
