'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { Evidencia } from '@/api/evidencias';
import { formatoFecha } from './formatoEvidencias';

/**
 * Una evidencia de la galería (RF-24, HU-10-02 y HU-10-04). La foto se amplía en un visor de
 * pantalla completa dentro de la página; un PDF se abre en otra pestaña. La dirección es la de
 * /api, que reenvía al backend con la sesión: el archivo nunca es público (NFR-007), y no pasa
 * por el optimizador de imágenes de Next, que lo guardaría en su caché.
 *
 * `detalles` son las líneas propias de cada pantalla (semana, docente, asignatura…).
 */
export function TarjetaEvidencia({
  url,
  evidencia,
  detalles,
}: {
  url: string;
  evidencia: Evidencia;
  detalles?: ReactNode;
}) {
  const [ampliada, setAmpliada] = useState(false);
  const miniatura = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef(false);
  // Al cerrar el visor, el foco vuelve a la miniatura. Se hace después de desmontarlo: mientras
  // el diálogo modal está abierto, el resto de la página no recibe el foco.
  useEffect(() => {
    if (!ampliada && devolverFoco.current) {
      devolverFoco.current = false;
      miniatura.current?.focus();
    }
  }, [ampliada]);
  const esImagen = evidencia.tipo.startsWith('image/');
  const clasesEnlace =
    'block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca';

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {esImagen ? (
        <button
          ref={miniatura}
          type="button"
          onClick={() => setAmpliada(true)}
          className={`${clasesEnlace} cursor-zoom-in`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={evidencia.descripcion}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full bg-slate-100 object-cover"
          />
          <span className="sr-only">Ampliar la foto</span>
        </button>
      ) : (
        <a href={url} target="_blank" rel="noopener" className={clasesEnlace}>
          <span className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-slate-100 text-slate-600">
            <span className="text-2xl font-bold">PDF</span>
            <span className="text-xs">Abrir</span>
          </span>
          <span className="sr-only">{`Abrir ${evidencia.nombreOriginal}`}</span>
        </a>
      )}
      <div className="space-y-1 p-3 text-sm">
        <p className="line-clamp-3">{evidencia.descripcion}</p>
        <p className="text-slate-700">{formatoFecha(evidencia.fecha)}</p>
        {detalles}
      </div>
      {ampliada && (
        <VisorEvidencia
          url={url}
          evidencia={evidencia}
          detalles={detalles}
          alCerrar={() => {
            devolverFoco.current = true;
            setAmpliada(false);
          }}
        />
      )}
    </li>
  );
}

/**
 * La foto ampliada, a pantalla completa en el teléfono. Es un `<dialog>` modal: el foco queda
 * dentro y el resto de la página no responde. Se cierra con «Cerrar», con Escape (o el gesto de
 * volver del teléfono) y tocando fuera de la foto; al cerrarse, el foco vuelve a la miniatura.
 *
 * Para cerrar se desmonta el componente, sin esperar el evento «close»: el navegador lo entrega
 * más tarde (o nunca, con la pestaña en segundo plano) y React monta dos veces en desarrollo.
 */
function VisorEvidencia({
  url,
  evidencia,
  detalles,
  alCerrar,
}: {
  url: string;
  evidencia: Evidencia;
  detalles?: ReactNode;
  alCerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (elemento && !elemento.open) {
      elemento.showModal();
    }
    // Sin limpieza: al desmontarse, el diálogo sale del documento y del primer plano.
  }, []);

  return (
    <dialog
      ref={dialogo}
      aria-label={`Evidencia: ${evidencia.descripcion}`}
      onCancel={(evento) => {
        // Escape o el gesto de volver: lo cierra el componente, no el navegador.
        evento.preventDefault();
        alCerrar();
      }}
      onClose={alCerrar}
      onClick={(evento) => {
        // Un toque en el fondo oscuro, fuera de la foto y del texto, también lo cierra.
        if (evento.target === evento.currentTarget) {
          alCerrar();
        }
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-slate-950 p-0 text-white backdrop:bg-slate-950/90 sm:m-auto sm:h-[90dvh] sm:w-[90vw] sm:max-w-5xl sm:rounded-2xl"
    >
      <div className="flex h-full flex-col">
        <div className="flex justify-end p-2">
          <button
            type="button"
            autoFocus
            onClick={alCerrar}
            className="min-h-11 rounded-lg bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
          >
            Cerrar
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={evidencia.descripcion}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="max-h-[35%] space-y-1 overflow-y-auto p-4 text-sm text-slate-100 [&_p]:text-slate-200">
          <p className="text-base text-white">{evidencia.descripcion}</p>
          <p>{formatoFecha(evidencia.fecha)}</p>
          {detalles}
        </div>
      </div>
    </dialog>
  );
}
