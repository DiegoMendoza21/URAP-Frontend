'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';

export type Consulta<T> =
  | { estado: 'inactiva' }
  | { estado: 'cargando' }
  | { estado: 'lista'; datos: T }
  | {
      estado: 'fallida';
      mensaje: string;
      /** Falso si el servidor respondió que no (403, 404…): reintentar no cambia nada. */
      reintentable: boolean;
    };

/**
 * Carga datos de la API cada vez que cambia `clave`, y cancela la carga anterior. Con
 * `clave` nula no consulta nada (por ejemplo, mientras no se ha elegido la asignatura).
 * `reintentar` repite la consulta después de un error.
 */
export function useConsulta<T>(
  clave: string | null,
  cargar: (senal: AbortSignal) => Promise<T>,
): Consulta<T> & { reintentar: () => void } {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<{
    clave: string;
    consulta: Consulta<T>;
  } | null>(null);
  const refCargar = useRef(cargar);
  useEffect(() => {
    refCargar.current = cargar;
  });

  const claveIntento = clave === null ? null : `${clave}#${intento}`;

  useEffect(() => {
    if (claveIntento === null) {
      return;
    }
    const controlador = new AbortController();
    refCargar.current(controlador.signal).then(
      (datos) =>
        setResultado({
          clave: claveIntento,
          consulta: { estado: 'lista', datos },
        }),
      (error: unknown) => {
        if (!controlador.signal.aborted) {
          setResultado({
            clave: claveIntento,
            consulta: {
              estado: 'fallida',
              mensaje: mensajeParaUsuario(error),
              // 429 (demasiadas solicitudes) es pasajero: tiene sentido reintentar.
              reintentable: !(
                error instanceof ErrorApi &&
                error.estado !== undefined &&
                error.estado < 500 &&
                error.estado !== 429
              ),
            },
          });
        }
      },
    );
    return () => controlador.abort();
  }, [claveIntento]);

  const reintentar = useCallback(() => setIntento((valor) => valor + 1), []);

  if (claveIntento === null) {
    return { estado: 'inactiva', reintentar };
  }
  if (resultado?.clave !== claveIntento) {
    return { estado: 'cargando', reintentar };
  }
  return { ...resultado.consulta, reintentar };
}
