'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  avisarCambioNotificaciones,
  consultarNotificaciones,
  destinoInterno,
  type FiltroNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  type Notificacion,
} from '@/api/notificaciones';
import {
  AvisoError,
  Cargando,
} from '../proyectos-docentes/_componentes/Estados';
import { momento } from '../proyectos-docentes/_componentes/fechas';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';

const TAMANO_PAGINA = 20;

const FILTROS: { valor: FiltroNotificaciones; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'no_leidas', etiqueta: 'Sin leer' },
];

/**
 * Bandeja de notificaciones del usuario (RF-26; HU-13-01 y HU-13-03): la asignación de un
 * proyecto docente, el envío a revisión, la aprobación y la devolución con observaciones.
 * Tocar una la marca como leída y abre lo que la originó (RF-26, poscondición).
 */
export function BandejaNotificaciones() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroNotificaciones>('todas');
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);

  const lista = useConsulta(`notificaciones-${filtro}-${pagina}`, (senal) =>
    consultarNotificaciones(filtro, pagina, TAMANO_PAGINA, senal),
  );
  const totalPaginas =
    lista.estado === 'lista'
      ? Math.max(1, Math.ceil(lista.datos.total / TAMANO_PAGINA))
      : 1;
  const hayNoLeidas =
    lista.estado === 'lista' &&
    lista.datos.elementos.some((notificacion) => !notificacion.leida);

  async function abrir(notificacion: Notificacion) {
    setError(null);
    const destino = destinoInterno(notificacion.urlDestino);
    if (!notificacion.leida) {
      try {
        await marcarLeida(notificacion.id);
        avisarCambioNotificaciones();
      } catch (fallo) {
        // Si no se pudo marcar, igual se abre lo que la originó: es lo que el usuario quiere.
        if (!destino) {
          setError(mensajeParaUsuario(fallo));
          return;
        }
      }
    }
    if (destino) {
      router.push(destino);
    } else {
      lista.reintentar();
    }
  }

  async function leerTodas() {
    setError(null);
    setMarcando(true);
    try {
      await marcarTodasLeidas();
      avisarCambioNotificaciones();
      lista.reintentar();
    } catch (fallo) {
      setError(mensajeParaUsuario(fallo));
    } finally {
      setMarcando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-notificaciones" className="space-y-5">
      <div className="space-y-1">
        <Link
          href="/"
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <h1
          id="titulo-notificaciones"
          className="text-2xl font-bold sm:text-3xl"
        >
          Notificaciones
        </h1>
        <p className="text-slate-700">
          Avisos de sus proyectos docentes: asignaciones, envíos a revisión,
          aprobaciones y devoluciones con observaciones.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Qué notificaciones mostrar"
          className="grid grid-cols-2 gap-1 rounded-lg border border-slate-300 bg-white p-1"
        >
          {FILTROS.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={filtro === opcion.valor}
              onClick={() => {
                setFiltro(opcion.valor);
                setPagina(1);
              }}
              className={`min-h-10 rounded-md px-4 text-sm font-semibold ${
                filtro === opcion.valor
                  ? 'bg-marca text-white'
                  : 'text-slate-800 hover:bg-slate-100'
              }`}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
        {hayNoLeidas && (
          <button
            type="button"
            onClick={() => void leerTodas()}
            disabled={marcando}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
          >
            {marcando ? 'Marcando…' : 'Marcar todas como leídas'}
          </button>
        )}
      </div>

      {error && <AvisoError mensaje={error} />}

      {lista.estado === 'cargando' && <Cargando />}
      {lista.estado === 'fallida' && (
        <AvisoError
          mensaje={lista.mensaje}
          reintentar={lista.reintentable ? lista.reintentar : undefined}
        />
      )}
      {lista.estado === 'lista' && lista.datos.total === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-600">
          {filtro === 'no_leidas'
            ? 'No tiene notificaciones sin leer.'
            : 'Todavía no tiene notificaciones. Aquí verá, por ejemplo, cuando le asignen un proyecto docente o se lo devuelvan con observaciones.'}
        </p>
      )}
      {lista.estado === 'lista' && lista.datos.elementos.length > 0 && (
        <>
          <ul className="space-y-3">
            {lista.datos.elementos.map((notificacion) => (
              <li key={notificacion.id}>
                <TarjetaNotificacion
                  notificacion={notificacion}
                  alAbrir={() => void abrir(notificacion)}
                />
              </li>
            ))}
          </ul>
          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas de notificaciones"
              className="flex items-center justify-between gap-3"
            >
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina(pagina - 1)}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-700">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina(pagina + 1)}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Una notificación. Las que no ha leído van resaltadas y dicen «Nueva» con texto, no solo con
 * color. Toda la tarjeta es el botón: en el teléfono se toca en cualquier parte.
 */
function TarjetaNotificacion({
  notificacion,
  alAbrir,
}: {
  notificacion: Notificacion;
  alAbrir: () => void;
}) {
  const nueva = !notificacion.leida;
  const destino = destinoInterno(notificacion.urlDestino);
  return (
    <button
      type="button"
      onClick={alAbrir}
      className={`block w-full space-y-1 rounded-xl border p-4 text-left shadow-sm hover:border-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca ${
        nueva ? 'border-marca/40 bg-marca/5' : 'border-slate-200 bg-white'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-semibold text-slate-900">
          {notificacion.titulo}
        </span>
        {nueva && (
          <span className="shrink-0 rounded-full bg-marca px-2 py-0.5 text-xs font-semibold text-white">
            Nueva
          </span>
        )}
      </span>
      <span className="block text-sm text-slate-700">
        {notificacion.mensaje}
      </span>
      <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        {notificacion.fecha && <span>{momento(notificacion.fecha)}</span>}
        {destino && <span className="font-semibold text-marca">Abrir →</span>}
      </span>
    </button>
  );
}
