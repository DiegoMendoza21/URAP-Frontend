import { Suspense } from 'react';
import { Cargando } from '../proyectos-docentes/_componentes/Estados';
import { ConsultaAuditoria } from './ConsultaAuditoria';

/** Se muestra después de confirmar la sesión (ver el layout del panel). */
export const instant = false;

export default function Auditoria() {
  // Los filtros se leen de la dirección (`useSearchParams`), y eso exige un límite de Suspense.
  return (
    <Suspense fallback={<Cargando />}>
      <ConsultaAuditoria />
    </Suspense>
  );
}
