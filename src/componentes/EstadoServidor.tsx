'use client';

import { useEffect, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import { consultarSalud } from '@/api/salud';

type Consulta =
  | { estado: 'consultando' }
  | { estado: 'disponible'; fecha: string }
  | { estado: 'error'; mensaje: string };

const COLOR_INDICADOR: Record<Consulta['estado'], string> = {
  consultando: 'bg-slate-400 motion-safe:animate-pulse',
  disponible: 'bg-emerald-600',
  error: 'bg-red-600',
};

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'medium',
});

/**
 * Consulta GET /api/salud desde el navegador y muestra si el servidor responde. Al hacerlo
 * desde el navegador comprueba también que el backend autorice este origen por CORS (NFR-006).
 */
export function EstadoServidor() {
  const [consulta, setConsulta] = useState<Consulta>({
    estado: 'consultando',
  });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    consultarSalud(controlador.signal).then(
      ({ fecha }) => setConsulta({ estado: 'disponible', fecha }),
      (error: unknown) => {
        // Si se canceló porque el componente se desmontó, no es una falla del servidor.
        if (!controlador.signal.aborted) {
          setConsulta({ estado: 'error', mensaje: mensajeParaUsuario(error) });
        }
      },
    );
    return () => controlador.abort();
  }, [intento]);

  const consultando = consulta.estado === 'consultando';

  function consultarDeNuevo() {
    if (consultando) {
      return;
    }
    setConsulta({ estado: 'consultando' });
    setIntento((anterior) => anterior + 1);
  }

  return (
    <section
      aria-labelledby="titulo-estado-servidor"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id="titulo-estado-servidor" className="text-base font-semibold">
        Conexión con el servidor
      </h2>
      <div role="status" className="mt-3 flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1.5 size-3 shrink-0 rounded-full ${COLOR_INDICADOR[consulta.estado]}`}
        />
        <Detalle consulta={consulta} />
      </div>
      {/* El botón no desaparece mientras se consulta, para no perder el foco del teclado. */}
      <button
        type="button"
        onClick={consultarDeNuevo}
        aria-disabled={consultando}
        className="mt-5 w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:w-auto"
      >
        Consultar de nuevo
      </button>
    </section>
  );
}

function Detalle({ consulta }: { consulta: Consulta }) {
  switch (consulta.estado) {
    case 'consultando':
      return <p>Verificando la conexión con el servidor de URAP…</p>;
    case 'disponible':
      return (
        <div className="space-y-1">
          <p className="font-medium">El servidor de URAP responde.</p>
          <p className="text-sm text-slate-600">
            Última verificación: {formatoFecha.format(new Date(consulta.fecha))}
          </p>
        </div>
      );
    case 'error':
      return (
        <div className="space-y-1">
          <p className="font-medium">El servidor de URAP no está disponible.</p>
          <p className="text-sm text-slate-700">{consulta.mensaje}</p>
        </div>
      );
  }
}
