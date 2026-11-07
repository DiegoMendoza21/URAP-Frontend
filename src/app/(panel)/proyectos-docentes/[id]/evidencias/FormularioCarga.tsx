'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import { cargarEvidencias, type OpcionesEvidencias } from '@/api/evidencias';
import { AvisoError } from '../../_componentes/Estados';
import { type Borrador, hoyLocal } from './borrador';
import {
  formatoFecha,
  formatoTamano,
  problemaDelArchivo,
  tiposLegibles,
} from './formato';

const DESCRIPCION_MAXIMA = 1000;

interface ArchivoElegido {
  id: number;
  archivo: File;
  /** URL local para la vista previa de una imagen; se libera al quitarla. */
  vistaPrevia: string | null;
}

type Estado =
  | { tipo: 'editando' }
  | { tipo: 'enviando'; avance: number }
  | {
      tipo: 'error';
      mensaje: string;
      detalles?: string[];
      /** La falla fue del servidor o de la red (p5): el mismo envío puede funcionar. */
      reintentable: boolean;
    }
  | { tipo: 'exito'; mensaje: string };

/**
 * Carga de evidencias (RF-24, p2 a p5), pensada para el teléfono: el docente toma la foto al
 * salir del salón. Si la carga falla, todo queda como estaba (archivos, descripción, fecha y
 * sesión) y se puede reintentar (p5). La descripción además queda en el borrador de la pestaña.
 */
export function FormularioCarga({
  idProyecto,
  opciones,
  idRap,
  nombreRap,
  borrador,
  actualizarBorrador,
  alCargar,
}: {
  idProyecto: number;
  opciones: OpcionesEvidencias;
  idRap: number;
  nombreRap: string;
  borrador: Borrador;
  actualizarBorrador: (cambios: Partial<Borrador>) => void;
  alCargar: (cantidad: number) => void;
}) {
  const ids = useId();
  const [archivos, setArchivos] = useState<ArchivoElegido[]>([]);
  const [rechazados, setRechazados] = useState<string[]>([]);
  const [estado, setEstado] = useState<Estado>({ tipo: 'editando' });
  const siguienteId = useRef(0);
  const refArchivos = useRef(archivos);
  useEffect(() => {
    refArchivos.current = archivos;
  });
  // Al salir de la pantalla se liberan las vistas previas que queden.
  useEffect(
    () => () => {
      for (const { vistaPrevia } of refArchivos.current) {
        if (vistaPrevia) {
          URL.revokeObjectURL(vistaPrevia);
        }
      }
    },
    [],
  );

  const enviando = estado.tipo === 'enviando';
  const hoy = hoyLocal();
  const sesiones = opciones.sesiones
    .filter((sesion) => sesion.fecha <= hoy)
    // filter ya dio una copia; reverse (y no toReversed) funciona en teléfonos más viejos.
    .reverse();
  const aceptar = [
    ...opciones.tiposMimePermitidos,
    ...opciones.extensionesPermitidas.map((extension) => `.${extension}`),
  ].join(',');

  function agregar(lista: FileList | null) {
    if (!lista || lista.length === 0) {
      return;
    }
    const problemas: string[] = [];
    const nuevos: ArchivoElegido[] = [];
    let espacio = opciones.maximoArchivosPorCarga - archivos.length;
    for (const archivo of Array.from(lista)) {
      const problema = problemaDelArchivo(archivo, opciones);
      if (problema) {
        problemas.push(problema);
      } else if (espacio <= 0) {
        problemas.push(
          `«${archivo.name}» no se agregó: puede cargar hasta ${opciones.maximoArchivosPorCarga} archivos por vez.`,
        );
      } else {
        espacio -= 1;
        nuevos.push({
          id: siguienteId.current++,
          archivo,
          vistaPrevia: archivo.type.startsWith('image/')
            ? URL.createObjectURL(archivo)
            : null,
        });
      }
    }
    setRechazados(problemas);
    setArchivos([...archivos, ...nuevos]);
    if (estado.tipo !== 'enviando') {
      setEstado({ tipo: 'editando' });
    }
  }

  function quitar(id: number) {
    const quitado = archivos.find((elegido) => elegido.id === id);
    if (quitado?.vistaPrevia) {
      URL.revokeObjectURL(quitado.vistaPrevia);
    }
    setArchivos(archivos.filter((elegido) => elegido.id !== id));
  }

  async function enviar() {
    if (archivos.length === 0) {
      setEstado({
        tipo: 'error',
        mensaje: 'Tome una foto o elija al menos un archivo.',
        reintentable: false,
      });
      return;
    }
    setRechazados([]);
    setEstado({ tipo: 'enviando', avance: 0 });
    try {
      const { evidencias } = await cargarEvidencias(
        idProyecto,
        {
          idRap,
          descripcion: borrador.descripcion.trim(),
          fecha: borrador.fecha,
          idSesion: borrador.idSesion ?? undefined,
          archivos: archivos.map(({ archivo }) => archivo),
        },
        (avance) => setEstado({ tipo: 'enviando', avance }),
      );
      for (const { vistaPrevia } of archivos) {
        if (vistaPrevia) {
          URL.revokeObjectURL(vistaPrevia);
        }
      }
      setArchivos([]);
      actualizarBorrador({
        descripcion: '',
        idSesion: null,
        fecha: hoyLocal(),
      });
      setEstado({
        tipo: 'exito',
        mensaje:
          evidencias.length === 1
            ? `Se cargó 1 evidencia en ${nombreRap}.`
            : `Se cargaron ${evidencias.length} evidencias en ${nombreRap}.`,
      });
      alCargar(evidencias.length);
    } catch (error) {
      // p5: no se toca nada de lo que el docente registró, para que pueda reintentar.
      const estadoHttp = error instanceof ErrorApi ? error.estado : undefined;
      setEstado({
        tipo: 'error',
        mensaje: mensajeParaUsuario(error),
        detalles: error instanceof ErrorApi ? error.detalles : undefined,
        reintentable:
          estadoHttp === undefined || estadoHttp >= 500 || estadoHttp === 429,
      });
    }
  }

  const pesoTotal = archivos.reduce(
    (total, { archivo }) => total + archivo.size,
    0,
  );

  return (
    <section
      aria-labelledby={`${ids}-titulo`}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 id={`${ids}-titulo`} className="text-lg font-semibold">
          Cargar evidencias en {nombreRap}
        </h2>
        <p className="text-sm text-slate-600">
          Archivos {tiposLegibles(opciones.extensionesPermitidas)} de hasta{' '}
          {opciones.tamanoMaximoMb} MB cada uno, hasta{' '}
          {opciones.maximoArchivosPorCarga} por vez.
        </p>
      </div>

      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!evento.currentTarget.reportValidity()) {
            return;
          }
          void enviar();
        }}
        className="space-y-4"
      >
        <fieldset disabled={enviando} className="space-y-4">
          <legend className="sr-only">Archivos</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {/* En el teléfono abre la cámara trasera; en el computador no aplica. */}
            <label className="hidden min-h-12 cursor-pointer items-center justify-center rounded-lg bg-marca px-4 py-3 text-center font-semibold text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-marca has-disabled:cursor-not-allowed has-disabled:opacity-60 pointer-coarse:flex">
              Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(evento) => {
                  agregar(evento.target.files);
                  evento.target.value = '';
                }}
              />
            </label>
            <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-marca bg-white px-4 py-3 text-center font-semibold text-marca hover:bg-marca/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-marca has-disabled:cursor-not-allowed has-disabled:opacity-60">
              Elegir archivos
              <input
                type="file"
                multiple
                accept={aceptar}
                className="sr-only"
                onChange={(evento) => {
                  agregar(evento.target.files);
                  evento.target.value = '';
                }}
              />
            </label>
          </div>

          {rechazados.length > 0 && (
            <AvisoError
              mensaje="Algunos archivos no se agregaron:"
              detalles={rechazados}
            />
          )}

          {archivos.length > 0 && (
            <ul
              aria-label="Archivos elegidos"
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {archivos.map(({ id, archivo, vistaPrevia }) => (
                <li
                  key={id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  {vistaPrevia ? (
                    // Vista previa local (blob:), que no pasa por el optimizador de Next.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vistaPrevia}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-xl font-bold text-slate-500">
                      PDF
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-1 p-2">
                    <p className="min-w-0 text-xs">
                      <span className="block truncate font-medium">
                        {archivo.name}
                      </span>
                      <span className="text-slate-600">
                        {formatoTamano(archivo.size)}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => quitar(id)}
                      aria-label={`Quitar ${archivo.name}`}
                      className="-m-1 min-h-9 min-w-9 shrink-0 rounded-md text-lg leading-none text-slate-600 hover:bg-slate-200"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <fieldset disabled={enviando} className="space-y-4">
          <legend className="sr-only">Datos de la evidencia</legend>
          <div className="space-y-1">
            <label
              htmlFor={`${ids}-descripcion`}
              className="block font-semibold"
            >
              Descripción
            </label>
            <textarea
              id={`${ids}-descripcion`}
              required
              maxLength={DESCRIPCION_MAXIMA}
              rows={3}
              value={borrador.descripcion}
              onChange={(evento) =>
                actualizarBorrador({ descripcion: evento.target.value })
              }
              placeholder="Qué muestra la evidencia y qué actividad se desarrolló"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <p className="text-right text-xs text-slate-500">
              {borrador.descripcion.length}/{DESCRIPCION_MAXIMA}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sesiones.length > 0 && (
              <div className="space-y-1">
                <label
                  htmlFor={`${ids}-sesion`}
                  className="block font-semibold"
                >
                  Sesión de clase{' '}
                  <span className="font-normal text-slate-600">(opcional)</span>
                </label>
                <select
                  id={`${ids}-sesion`}
                  value={borrador.idSesion ?? ''}
                  onChange={(evento) => {
                    const idSesion = evento.target.value
                      ? Number(evento.target.value)
                      : null;
                    const sesion = sesiones.find(({ id }) => id === idSesion);
                    actualizarBorrador(
                      sesion
                        ? { idSesion, fecha: sesion.fecha }
                        : { idSesion: null },
                    );
                  }}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="">Sin sesión relacionada</option>
                  {sesiones.map((sesion) => (
                    <option key={sesion.id} value={sesion.id}>
                      {`${sesion.semana ? `Semana ${sesion.semana} · ` : ''}${formatoFecha(sesion.fecha)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor={`${ids}-fecha`} className="block font-semibold">
                Fecha
              </label>
              <input
                id={`${ids}-fecha`}
                type="date"
                required
                max={hoy}
                value={borrador.fecha}
                onChange={(evento) =>
                  actualizarBorrador({ fecha: evento.target.value })
                }
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Si en la foto aparecen estudiantes que se puedan identificar,
            cárguela solo si cuenta con su autorización de tratamiento de imagen
            (Ley 1581 de 2012).
          </p>
        </fieldset>

        {estado.tipo === 'error' && (
          <AvisoError mensaje={estado.mensaje} detalles={estado.detalles} />
        )}
        {estado.tipo === 'exito' && (
          <p
            role="status"
            className="rounded-lg bg-green-50 px-3 py-3 text-sm font-medium text-green-900"
          >
            {estado.mensaje}
          </p>
        )}
        {estado.tipo === 'enviando' && (
          <div role="status" className="space-y-1">
            <p className="text-sm text-slate-700">
              Cargando {formatoTamano(pesoTotal)}…{' '}
              {Math.round(estado.avance * 100)} %
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-marca transition-[width]"
                style={{ width: `${Math.round(estado.avance * 100)}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="min-h-12 w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-60 sm:w-auto"
        >
          {enviando
            ? 'Cargando…'
            : estado.tipo === 'error' &&
                estado.reintentable &&
                archivos.length > 0
              ? 'Intentar de nuevo'
              : archivos.length > 1
                ? `Cargar ${archivos.length} evidencias`
                : 'Cargar evidencia'}
        </button>
      </form>
    </section>
  );
}
