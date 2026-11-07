'use client';

import {
  consultarEvidencias,
  type Evidencia,
  urlArchivoEvidencia,
} from '@/api/evidencias';
import { nombreDocente } from '@/api/proyectos-docentes';
import { AvisoError, Cargando } from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { formatoFecha, formatoTamano } from './formato';

const TAMANO_PAGINA = 12;

/**
 * Galería de evidencias de un RAP (RF-24, p6). Las imágenes se piden a /api, que las reenvía
 * al backend con la sesión: no son públicas y no pasan por el optimizador de imágenes de Next,
 * que las guardaría en su caché.
 */
export function GaleriaEvidencias({
  idProyecto,
  idRap,
  nombreRap,
  pagina,
  alCambiarPagina,
  version,
}: {
  idProyecto: number;
  idRap: number;
  nombreRap: string;
  pagina: number;
  alCambiarPagina: (pagina: number) => void;
  version: number;
}) {
  const galeria = useConsulta(
    `galeria-${idProyecto}-${idRap}-${pagina}-${version}`,
    (senal) =>
      consultarEvidencias(idProyecto, idRap, pagina, TAMANO_PAGINA, senal),
  );
  const totalPaginas =
    galeria.estado === 'lista'
      ? Math.max(1, Math.ceil(galeria.datos.total / TAMANO_PAGINA))
      : 1;

  return (
    <section aria-labelledby="titulo-galeria" className="space-y-3">
      <h2 id="titulo-galeria" className="text-lg font-semibold">
        Galería de {nombreRap}
        {galeria.estado === 'lista' && (
          <span className="font-normal text-slate-600">
            {' '}
            · {galeria.datos.total}
          </span>
        )}
      </h2>

      {galeria.estado === 'cargando' && <Cargando />}
      {galeria.estado === 'fallida' && (
        <AvisoError
          mensaje={galeria.mensaje}
          reintentar={galeria.reintentable ? galeria.reintentar : undefined}
        />
      )}
      {galeria.estado === 'lista' && galeria.datos.total === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-600">
          {nombreRap} todavía no tiene evidencias en este proyecto.
        </p>
      )}
      {galeria.estado === 'lista' && galeria.datos.elementos.length > 0 && (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {galeria.datos.elementos.map((evidencia) => (
              <TarjetaEvidencia
                key={evidencia.id}
                idProyecto={idProyecto}
                evidencia={evidencia}
              />
            ))}
          </ul>
          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas de la galería"
              className="flex items-center justify-between gap-3"
            >
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => alCambiarPagina(pagina - 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-700">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => alCambiarPagina(pagina + 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
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

function TarjetaEvidencia({
  idProyecto,
  evidencia,
}: {
  idProyecto: number;
  evidencia: Evidencia;
}) {
  const url = urlArchivoEvidencia(idProyecto, evidencia.id);
  const esImagen = evidencia.tipo.startsWith('image/');

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <a
        href={url}
        target="_blank"
        rel="noopener"
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
      >
        {esImagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={evidencia.descripcion}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full bg-slate-100 object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-slate-100 text-slate-600">
            <span className="text-2xl font-bold">PDF</span>
            <span className="text-xs">Abrir</span>
          </div>
        )}
        <span className="sr-only">
          {esImagen
            ? 'Ver la foto completa'
            : `Abrir ${evidencia.nombreOriginal}`}
        </span>
      </a>
      <div className="space-y-1 p-3 text-sm">
        <p className="line-clamp-3">{evidencia.descripcion}</p>
        <p className="text-slate-700">
          {formatoFecha(evidencia.fecha)}
          {evidencia.sesion?.semana
            ? ` · Semana ${evidencia.sesion.semana}`
            : ''}
        </p>
        <p className="text-xs text-slate-500">
          {evidencia.subidoPor
            ? `${nombreDocente(evidencia.subidoPor)} · `
            : ''}
          {formatoTamano(evidencia.tamanoBytes)}
        </p>
      </div>
    </li>
  );
}
