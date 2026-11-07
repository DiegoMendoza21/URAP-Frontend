'use client';

import { useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import { guardarArchivo } from '@/api/descargas';
import { AvisoError } from '../../proyectos-docentes/_componentes/Estados';

type Estado =
  | { estado: 'inactiva' }
  | { estado: 'descargando' }
  | { estado: 'fallida'; mensaje: string };

/**
 * Exportación de un reporte (RF-28 y RF-32, p5): Excel lo genera el backend; el PDF, la
 * ventana de impresión del navegador («Guardar como PDF»), que oculta lo marcado `print:hidden`.
 * Si la descarga falla, muestra el error y deja reintentar (RF-28, excepción de p5).
 */
export function Exportar({
  descargar,
}: {
  descargar: () => Promise<{ archivo: Blob; nombre: string }>;
}) {
  const [descarga, setDescarga] = useState<Estado>({ estado: 'inactiva' });

  const exportarExcel = async () => {
    setDescarga({ estado: 'descargando' });
    try {
      guardarArchivo(await descargar());
      setDescarga({ estado: 'inactiva' });
    } catch (error) {
      setDescarga({ estado: 'fallida', mensaje: mensajeParaUsuario(error) });
    }
  };

  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void exportarExcel()}
          disabled={descarga.estado === 'descargando'}
          className="rounded-lg border border-marca px-4 py-3 font-semibold text-marca hover:bg-marca/5 disabled:opacity-60"
        >
          {descarga.estado === 'descargando'
            ? 'Preparando el Excel…'
            : 'Exportar a Excel'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-marca px-4 py-3 font-semibold text-marca hover:bg-marca/5"
        >
          Exportar a PDF
        </button>
      </div>
      <p className="text-sm text-slate-600">
        Para el PDF, elija «Guardar como PDF» en la ventana de impresión.
      </p>
      {descarga.estado === 'fallida' && (
        <AvisoError
          mensaje={descarga.mensaje}
          reintentar={() => void exportarExcel()}
        />
      )}
    </div>
  );
}
