'use client';

import { useId, useState, type FormEvent } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import { type MedicionDetalle, registrarInstrumentos } from '@/api/mediciones';
import { AvisoError } from '../../proyectos-docentes/_componentes/Estados';

type EstadoEnvio =
  | { estado: 'inactivo' }
  | { estado: 'enviando' }
  | { estado: 'guardado' }
  | { estado: 'fallido'; mensaje: string; detalles?: string[] };

/** Largo de `medicion_indicador.instrumento` en el backend. */
const INSTRUMENTO_MAXIMO = 255;

/**
 * Instrumento con que se evaluó cada indicador (RF-30, p4; HU-11-02). Aparece después en el
 * consolidado y en el reporte de logro.
 */
export function Instrumentos({
  medicion,
  alGuardar,
}: {
  medicion: MedicionDetalle;
  alGuardar: (medicion: MedicionDetalle) => void;
}) {
  const idAyuda = useId();
  const [campos, setCampos] = useState(() =>
    medicion.indicadores.map((indicador) => ({
      idIndicador: indicador.idIndicador,
      instrumento: indicador.instrumento ?? '',
      descripcion: indicador.descripcionInstrumento ?? '',
    })),
  );
  const [envio, setEnvio] = useState<EstadoEnvio>({ estado: 'inactivo' });
  // Plegada al entrar: en el teléfono, los cuatro formularios empujarían la valoración lejos.
  const [abierta, setAbierta] = useState(false);
  const registrados = medicion.indicadores.filter(
    (indicador) => indicador.instrumento,
  ).length;
  const idFormulario = useId();

  const cambiar = (
    idIndicador: number,
    campo: 'instrumento' | 'descripcion',
    valor: string,
  ) => {
    setCampos((actuales) =>
      actuales.map((fila) =>
        fila.idIndicador === idIndicador ? { ...fila, [campo]: valor } : fila,
      ),
    );
    setEnvio({ estado: 'inactivo' });
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    const conInstrumento = campos.filter((fila) => fila.instrumento.trim());
    const sinNombre = campos.find(
      (fila) => !fila.instrumento.trim() && fila.descripcion.trim(),
    );
    // Un instrumento ya registrado no se puede dejar vacío: el backend lo exige.
    const vaciado = campos.find(
      (fila, i) =>
        !fila.instrumento.trim() && medicion.indicadores[i]?.instrumento,
    );
    const problema = vaciado
      ? 'Un instrumento ya registrado no se puede dejar vacío: escriba el que usó o déjelo como estaba.'
      : sinNombre
        ? 'Escriba el nombre del instrumento de cada indicador que tenga descripción.'
        : conInstrumento.length === 0
          ? 'Escriba al menos un instrumento de evaluación.'
          : null;
    if (problema) {
      setEnvio({ estado: 'fallido', mensaje: problema });
      return;
    }
    setEnvio({ estado: 'enviando' });
    try {
      const actualizada = await registrarInstrumentos(
        medicion.id,
        conInstrumento.map((fila) => ({
          idIndicador: fila.idIndicador,
          instrumento: fila.instrumento.trim(),
          descripcionInstrumento: fila.descripcion.trim() || null,
        })),
      );
      alGuardar(actualizada);
      setEnvio({ estado: 'guardado' });
    } catch (error) {
      setEnvio({
        estado: 'fallido',
        mensaje: mensajeParaUsuario(error),
        detalles: error instanceof ErrorApi ? error.detalles : undefined,
      });
    }
  };

  return (
    <section
      aria-labelledby="titulo-instrumentos"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="titulo-instrumentos" className="text-lg font-semibold">
            Instrumentos de evaluación
          </h2>
          <p id={idAyuda} className="text-sm text-slate-600">
            Con qué evaluó cada indicador de desempeño: un taller, un parcial,
            un caso…{' '}
            <strong className="text-slate-800">
              {registrados} de {medicion.indicadores.length} registrados.
            </strong>
          </p>
        </div>
        {medicion.puedeEditar && (
          <button
            type="button"
            aria-expanded={abierta}
            aria-controls={idFormulario}
            onClick={() => setAbierta((valor) => !valor)}
            className="rounded-lg border border-marca px-4 py-2 font-semibold text-marca hover:bg-marca/5"
          >
            {abierta ? 'Ocultar' : registrados > 0 ? 'Editar' : 'Registrar'}
          </button>
        )}
      </div>

      {!medicion.puedeEditar ? (
        <dl className="space-y-3">
          {medicion.indicadores.map((indicador) => (
            <div key={indicador.idIndicador}>
              <dt className="font-semibold">
                Indicador {indicador.numero ?? ''}
              </dt>
              <dd className="text-sm text-slate-700">
                {indicador.instrumento ?? 'Sin instrumento registrado'}
                {indicador.descripcionInstrumento &&
                  ` — ${indicador.descripcionInstrumento}`}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <form
          id={idFormulario}
          hidden={!abierta}
          onSubmit={guardar}
          className="space-y-5"
          noValidate
        >
          {medicion.indicadores.map((indicador, i) => (
            <fieldset key={indicador.idIndicador} className="space-y-2">
              <legend className="font-semibold">
                Indicador {indicador.numero ?? i + 1}
              </legend>
              {indicador.descripcion && (
                <p className="text-sm text-slate-700">
                  {indicador.descripcion}
                </p>
              )}
              <div className="space-y-1">
                <label
                  htmlFor={`${idFormulario}-instrumento-${indicador.idIndicador}`}
                  className="block text-sm font-medium"
                >
                  Instrumento
                  <span className="sr-only">
                    {' '}
                    del indicador {indicador.numero ?? i + 1}
                  </span>
                </label>
                <input
                  id={`${idFormulario}-instrumento-${indicador.idIndicador}`}
                  type="text"
                  value={campos[i].instrumento}
                  maxLength={INSTRUMENTO_MAXIMO}
                  aria-describedby={idAyuda}
                  onChange={(evento) =>
                    cambiar(
                      indicador.idIndicador,
                      'instrumento',
                      evento.target.value,
                    )
                  }
                  className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor={`${idFormulario}-descripcion-${indicador.idIndicador}`}
                  className="block text-sm font-medium"
                >
                  Descripción
                  <span className="sr-only">
                    {' '}
                    del instrumento del indicador {indicador.numero ?? i + 1}
                  </span>{' '}
                  <span className="font-normal">(opcional)</span>
                </label>
                <textarea
                  id={`${idFormulario}-descripcion-${indicador.idIndicador}`}
                  rows={2}
                  value={campos[i].descripcion}
                  onChange={(evento) =>
                    cambiar(
                      indicador.idIndicador,
                      'descripcion',
                      evento.target.value,
                    )
                  }
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
            </fieldset>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={envio.estado === 'enviando'}
              className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-60 sm:w-auto"
            >
              {envio.estado === 'enviando'
                ? 'Guardando…'
                : 'Guardar instrumentos'}
            </button>
            {envio.estado === 'guardado' && (
              <p role="status" className="text-sm font-medium text-emerald-800">
                Instrumentos guardados.
              </p>
            )}
          </div>
          {envio.estado === 'fallido' && (
            <AvisoError mensaje={envio.mensaje} detalles={envio.detalles} />
          )}
        </form>
      )}
    </section>
  );
}
