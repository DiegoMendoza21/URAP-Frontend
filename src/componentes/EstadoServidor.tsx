'use client';

import { useEffect, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import { consultarSalud } from '@/api/salud';

type Consulta =
  | { estado: 'consultando' }
  | { estado: 'disponible' }
  | { estado: 'error'; mensaje: string };

const COLOR_INDICADOR: Record<Consulta['estado'], string> = {
  consultando: 'bg-slate-400 motion-safe:animate-pulse',
  disponible: 'bg-emerald-600',
  error: 'bg-red-600',
};

/**
 * Línea con el estado del servidor (GET /api/salud). En la pantalla de inicio de sesión ayuda
 * a distinguir un servidor caído de un dato mal escrito.
 */
export function EstadoServidor() {
  const [consulta, setConsulta] = useState<Consulta>({
    estado: 'consultando',
  });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    consultarSalud(controlador.signal).then(
      () => setConsulta({ estado: 'disponible' }),
      (error: unknown) => {
        // Si se canceló porque el componente se desmontó, no es una falla del servidor.
        if (!controlador.signal.aborted) {
          setConsulta({ estado: 'error', mensaje: mensajeParaUsuario(error) });
        }
      },
    );
    return () => controlador.abort();
  }, [intento]);

  function consultarDeNuevo() {
    setConsulta({ estado: 'consultando' });
    setIntento((anterior) => anterior + 1);
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-slate-600"
    >
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full ${COLOR_INDICADOR[consulta.estado]}`}
      />
      {consulta.estado === 'consultando' && (
        <span>Verificando el servidor…</span>
      )}
      {consulta.estado === 'disponible' && <span>Servidor disponible</span>}
      {consulta.estado === 'error' && (
        <>
          <span>{consulta.mensaje}</span>
          <button
            type="button"
            onClick={consultarDeNuevo}
            className="font-medium text-marca underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-marca"
          >
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}
