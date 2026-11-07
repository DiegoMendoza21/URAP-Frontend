import type { ProyectoSeguimiento } from '@/api/seguimiento';
import { porcentaje } from '@/componentes/formato';

/*
 * Indicadores de un proyecto en el tablero de seguimiento (RF-25) y en el reporte de
 * cumplimiento (RF-28). Los calcula el backend; aquí solo se presentan.
 */

export function Secciones({ proyecto }: { proyecto: ProyectoSeguimiento }) {
  const { secciones } = proyecto;
  return (
    <>
      <span className="font-medium">
        {secciones.completas} de {secciones.total} (
        {porcentaje(secciones.porcentaje)})
      </span>
      {secciones.incompletas.length > 0 && (
        <span className="block text-xs text-slate-600">
          Faltan: {secciones.incompletas.join(', ')}
        </span>
      )}
    </>
  );
}

export function Sesiones({ proyecto }: { proyecto: ProyectoSeguimiento }) {
  const { sesiones } = proyecto;
  const atrasadas = sesiones.vencidas + sesiones.incumplidas;
  return (
    <>
      <span className="font-medium">
        {sesiones.registradas} de {sesiones.programadas} registradas
      </span>
      {atrasadas > 0 && (
        <span className="block text-xs font-semibold text-red-800">
          {atrasadas} {atrasadas === 1 ? 'vencida' : 'vencidas'}
          {sesiones.mayorAtraso !== null &&
            ` · la más antigua hace ${sesiones.mayorAtraso} ${sesiones.mayorAtraso === 1 ? 'día' : 'días'}`}
        </span>
      )}
      {sesiones.porVencer > 0 && (
        <span className="block text-xs text-amber-900">
          {sesiones.porVencer} por vencer
        </span>
      )}
    </>
  );
}

export function Evidencias({ proyecto }: { proyecto: ProyectoSeguimiento }) {
  if (proyecto.evidencias.length === 0) {
    return <span className="text-slate-600">Sin RAP asociados</span>;
  }
  return (
    <ul>
      {proyecto.evidencias.map((evidencia) => (
        <li
          key={evidencia.idRap}
          className={evidencia.cantidad === 0 ? 'text-slate-600' : undefined}
        >
          {evidencia.rap}: {evidencia.cantidad}
        </li>
      ))}
    </ul>
  );
}
