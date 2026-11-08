'use client';

import {
  consultarHistorial,
  FIRMA_EVENTO,
  nombrePersona,
  RESULTADO_EVENTO,
} from '@/api/revision';
import { AvisoError, Cargando, Insignia } from '../_componentes/Estados';
import { momento } from '../_componentes/fechas';
import { useConsulta } from '../_componentes/useConsulta';

/**
 * Historial de revisiones (HU-07-06): cada envío, devolución y aprobación con quién, cuándo y
 * el cambio de estado. Sustituye las firmas «elaboró», «revisó» y «aprobó» del formato; es de
 * solo lectura.
 */
export function HistorialRevisiones({ idProyecto }: { idProyecto: number }) {
  const historial = useConsulta(`historial-${idProyecto}`, (senal) =>
    consultarHistorial(idProyecto, senal),
  );

  return (
    <section
      aria-labelledby="titulo-historial"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="titulo-historial" className="text-lg font-semibold">
        Revisiones
      </h2>
      {historial.estado === 'cargando' && <Cargando />}
      {historial.estado === 'fallida' && (
        <AvisoError
          mensaje={historial.mensaje}
          reintentar={historial.reintentable ? historial.reintentar : undefined}
        />
      )}
      {historial.estado === 'lista' && historial.datos.length === 0 && (
        <p className="text-sm text-slate-600">
          El proyecto todavía no se ha enviado a revisión.
        </p>
      )}
      {historial.estado === 'lista' && historial.datos.length > 0 && (
        <ol className="space-y-3">
          {historial.datos.map((evento) => (
            <li
              key={evento.id}
              className="space-y-1 border-l-2 border-marca/30 pl-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {FIRMA_EVENTO[evento.tipo] ?? evento.tipo}:{' '}
                  {nombrePersona(evento.usuario)}
                </span>
                <Insignia
                  tono={
                    evento.resultado === 'aprobado'
                      ? 'marca'
                      : evento.resultado === 'devuelto'
                        ? 'advertencia'
                        : 'neutro'
                  }
                >
                  {RESULTADO_EVENTO[evento.resultado] ?? evento.resultado}
                </Insignia>
              </div>
              <p className="text-sm text-slate-600">
                {evento.fecha ? momento(evento.fecha) : 'Sin fecha'}
                {evento.observaciones > 0 &&
                  ` · ${evento.observaciones === 1 ? '1 observación' : `${evento.observaciones} observaciones`} por sección`}
              </p>
              {evento.observacionGeneral && (
                <p className="text-sm text-slate-700 italic">
                  «{evento.observacionGeneral}»
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
