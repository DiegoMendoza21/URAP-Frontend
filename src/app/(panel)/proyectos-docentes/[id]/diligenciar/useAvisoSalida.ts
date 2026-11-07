'use client';

import { useEffect } from 'react';

/**
 * Pide confirmación al cerrar o recargar la pestaña mientras haya cambios sin guardar. El
 * navegador muestra su propio mensaje; el texto no se puede personalizar.
 */
export function useAvisoSalida(hayCambios: boolean) {
  useEffect(() => {
    if (!hayCambios) {
      return;
    }
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);
}
