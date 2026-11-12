import { Suspense } from 'react';
import { Cargando } from '../_componentes/Estados';
import { FichaProyectoDocente } from './FichaProyectoDocente';

/** Se muestra después de confirmar la sesión (ver el layout del panel). */
export const instant = false;

export default function ProyectoDocente() {
  // La ficha lee `?duplicado=1` (RF-09): useSearchParams pide un límite de Suspense.
  return (
    <Suspense fallback={<Cargando />}>
      <FichaProyectoDocente />
    </Suspense>
  );
}
