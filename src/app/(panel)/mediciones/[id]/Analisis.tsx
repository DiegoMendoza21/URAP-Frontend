'use client';

import { useId, useState, type FormEvent } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  cerrarMedicion,
  type MedicionDetalle,
  reabrirMedicion,
  registrarAnalisis,
} from '@/api/mediciones';
import { AvisoError } from '../../proyectos-docentes/_componentes/Estados';

type Estado =
  | { estado: 'inactivo' }
  | { estado: 'enviando'; accion: 'guardar' | 'cerrar' | 'reabrir' }
  | { estado: 'listo'; mensaje: string }
  | { estado: 'fallido'; mensaje: string; detalles?: string[] };

const CAMPOS = [
  {
    clave: 'accionesImplementadas',
    etiqueta: 'Acciones implementadas',
    ayuda: 'Lo que se hizo durante el curso para favorecer el resultado.',
  },
  {
    clave: 'resultadosObtenidos',
    etiqueta: 'Resultados obtenidos',
    ayuda: 'Qué se logró con esas acciones.',
  },
  {
    clave: 'accionesPropuestas',
    etiqueta: 'Acciones propuestas',
    ayuda:
      'Qué se propone para mejorar. Obligatorias si el resultado queda por debajo de la meta.',
  },
] as const;

type Clave = (typeof CAMPOS)[number]['clave'];

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/**
 * Hoja «Evaluación» (RF-31, p5 a p7; HU-11-06 y HU-11-07): acciones de mejora y cierre de la
 * medición. Las registran el docente del curso o el líder del RAP; solo el departamento
 * académico reabre una medición cerrada. El backend decide (`puedeAnalizar`, `puedeReabrir`).
 */
export function Analisis({
  medicion,
  alCambiar,
}: {
  medicion: MedicionDetalle;
  alCambiar: (medicion: MedicionDetalle) => void;
}) {
  const id = useId();
  const [textos, setTextos] = useState<Record<Clave, string>>(() => ({
    accionesImplementadas: medicion.accionesImplementadas ?? '',
    resultadosObtenidos: medicion.resultadosObtenidos ?? '',
    accionesPropuestas: medicion.accionesPropuestas ?? '',
  }));
  const [estado, setEstado] = useState<Estado>({ estado: 'inactivo' });
  const [confirmando, setConfirmando] = useState(false);

  const ejecutar = async (
    accion: 'guardar' | 'cerrar' | 'reabrir',
    hacer: () => Promise<MedicionDetalle>,
    exito: string,
  ) => {
    setEstado({ estado: 'enviando', accion });
    try {
      const actualizada = await hacer();
      alCambiar(actualizada);
      setEstado({ estado: 'listo', mensaje: exito });
    } catch (error) {
      setEstado({
        estado: 'fallido',
        mensaje: mensajeParaUsuario(error),
        detalles: error instanceof ErrorApi ? error.detalles : undefined,
      });
    } finally {
      setConfirmando(false);
    }
  };

  const guardar = (evento: FormEvent) => {
    evento.preventDefault();
    void ejecutar(
      'guardar',
      () => registrarAnalisis(medicion.id, textos),
      'Análisis guardado.',
    );
  };

  // Se guarda el análisis antes de cerrar: el backend exige las acciones propuestas guardadas.
  const cerrar = () =>
    ejecutar(
      'cerrar',
      async () => {
        await registrarAnalisis(medicion.id, textos);
        return cerrarMedicion(medicion.id);
      },
      'Medición cerrada.',
    );

  const reabrir = () =>
    ejecutar(
      'reabrir',
      () => reabrirMedicion(medicion.id),
      'Medición reabierta: el docente puede corregir las valoraciones.',
    );

  const enviando = estado.estado === 'enviando';
  const editable = medicion.puedeAnalizar;

  return (
    <section
      aria-labelledby="titulo-analisis"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 id="titulo-analisis" className="text-lg font-semibold">
          Análisis y acciones de mejora
        </h2>
        {medicion.estado === 'cerrada' && (
          <p className="text-sm text-slate-700">
            Cerrada
            {medicion.cerradoPor ? ` por ${medicion.cerradoPor}` : ''}
            {medicion.fechaCierre
              ? ` el ${formatoFecha.format(new Date(medicion.fechaCierre))}`
              : ''}
          </p>
        )}
      </div>

      {editable ? (
        <form onSubmit={guardar} className="space-y-4" noValidate>
          {CAMPOS.map((campo) => (
            <div key={campo.clave} className="space-y-1">
              <label
                htmlFor={`${id}-${campo.clave}`}
                className="block font-medium"
              >
                {campo.etiqueta}
              </label>
              <p
                id={`${id}-${campo.clave}-ayuda`}
                className="text-sm text-slate-600"
              >
                {campo.ayuda}
              </p>
              <textarea
                id={`${id}-${campo.clave}`}
                rows={3}
                maxLength={4000}
                value={textos[campo.clave]}
                aria-describedby={`${id}-${campo.clave}-ayuda`}
                onChange={(evento) => {
                  const valor = evento.target.value;
                  setTextos((actuales) => ({
                    ...actuales,
                    [campo.clave]: valor,
                  }));
                  setEstado({ estado: 'inactivo' });
                }}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg border border-marca px-4 py-3 font-semibold text-marca hover:bg-marca/5 disabled:opacity-60"
            >
              {estado.estado === 'enviando' && estado.accion === 'guardar'
                ? 'Guardando…'
                : 'Guardar análisis'}
            </button>
            {!confirmando ? (
              <button
                type="button"
                disabled={enviando}
                onClick={() => setConfirmando(true)}
                className="rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60"
              >
                Cerrar la medición
              </button>
            ) : (
              <div
                role="alertdialog"
                aria-labelledby={`${id}-confirmar`}
                className="w-full space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-3"
              >
                <p id={`${id}-confirmar`} className="text-sm">
                  Al cerrarla, las valoraciones quedan bloqueadas y el resultado
                  pasa al reporte de logro del programa. Solo el departamento
                  académico puede reabrirla.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => void cerrar()}
                    className="rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60"
                  >
                    {estado.estado === 'enviando' && estado.accion === 'cerrar'
                      ? 'Cerrando…'
                      : 'Sí, cerrar la medición'}
                  </button>
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => setConfirmando(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      ) : (
        <dl className="space-y-3">
          {CAMPOS.map((campo) => (
            <div key={campo.clave}>
              <dt className="font-semibold">{campo.etiqueta}</dt>
              <dd className="text-sm whitespace-pre-line text-slate-700">
                {medicion[campo.clave] ?? 'Sin registrar'}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {medicion.puedeReabrir && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => void reabrir()}
          className="w-full rounded-lg border border-marca px-4 py-3 font-semibold text-marca hover:bg-marca/5 disabled:opacity-60 sm:w-auto"
        >
          {estado.estado === 'enviando' && estado.accion === 'reabrir'
            ? 'Reabriendo…'
            : 'Reabrir la medición'}
        </button>
      )}

      {estado.estado === 'listo' && (
        <p role="status" className="text-sm font-medium text-emerald-800">
          {estado.mensaje}
        </p>
      )}
      {estado.estado === 'fallido' && (
        <AvisoError mensaje={estado.mensaje} detalles={estado.detalles} />
      )}
    </section>
  );
}
