'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  type ActividadEvaluacion,
  cambioRechazado,
  consultarEvaluacion,
  guardarEvaluacion,
  type RacEvaluacion,
  type SeccionEvaluacion as DatosSeccionEvaluacion,
} from '@/api/diligenciamiento';
import { AvisoError, Cargando, Insignia } from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { BotonGuardar, BotonSecundario } from './Controles';
import type { PropiedadesSeccion } from './DiligenciamientoProyecto';
import { nuevaClave } from './EditorLista';

/** Mismos límites que valida el backend (GuardarEvaluacionRacDto). */
const ACTIVIDAD_MAXIMO = 1000;
const INSTRUMENTO_MAXIMO = 255;
const ACTIVIDADES_MAXIMO = 20;

const formatoPeso = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 2,
});

const peso = (valor: number) => `${formatoPeso.format(valor)} %`;

/**
 * Punto 5 «Evaluación de los resultados de aprendizaje» (RF-14, HU-06-05): para cada RAC del
 * curso, las actividades e instrumentos con los que se evaluará. Señala los RAC sin
 * evaluación (p4). Cada RAC se guarda por separado (HU-06-08).
 */
export function SeccionEvaluacion({
  idProyecto,
  puedeEditar,
  visible,
  alGuardar,
  alCambiar,
}: PropiedadesSeccion) {
  const consulta = useConsulta(`evaluacion-${idProyecto}`, (senal) =>
    consultarEvaluacion(idProyecto, senal),
  );
  const [actual, setActual] = useState<DatosSeccionEvaluacion | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (editando === null) {
      alCambiar(false);
    }
  }, [alCambiar, editando]);

  // Los RAC se registran en el punto 3, otra pestaña que también queda montada. Al volver a
  // esta, se consultan otra vez para mostrar los nuevos o los cambiados, sin «Cargando…». Si
  // hay una evaluación a medio editar no se toca, para no perder el borrador: al guardarla,
  // la respuesta ya trae los RAC al día.
  const cargada = consulta.estado === 'lista';
  const estabaVisible = useRef(visible);
  useEffect(() => {
    const reaparece = visible === true && !estabaVisible.current;
    estabaVisible.current = visible;
    if (!reaparece || !cargada || editando !== null) {
      return;
    }
    const controlador = new AbortController();
    consultarEvaluacion(idProyecto, controlador.signal).then(setActual, () => {
      // Si falla, queda en pantalla lo que ya había.
    });
    return () => controlador.abort();
  }, [visible, cargada, editando, idProyecto]);

  if (consulta.estado === 'cargando' || consulta.estado === 'inactiva') {
    return <Cargando />;
  }
  if (consulta.estado === 'fallida') {
    return (
      <AvisoError
        mensaje={consulta.mensaje}
        reintentar={consulta.reintentable ? consulta.reintentar : undefined}
      />
    );
  }
  const seccion = actual ?? consulta.datos;
  const sinEvaluacion = new Set(seccion.racsSinEvaluacion);

  if (seccion.racs.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        {puedeEditar
          ? 'Registre primero los RAC del curso en el punto 3: la evaluación se diligencia por cada RAC.'
          : 'El proyecto todavía no tiene RAC registrados.'}
      </p>
    );
  }

  async function guardar(
    rac: RacEvaluacion,
    actividades: ActividadEvaluacion[],
  ): Promise<string | null> {
    try {
      setActual(await guardarEvaluacion(idProyecto, rac.id, actividades));
      setEditando(null);
      setAviso(`Evaluación de ${rac.codigo} guardada.`);
      alGuardar();
      return null;
    } catch (falla) {
      if (cambioRechazado(falla)) {
        alGuardar();
      }
      return mensajeParaUsuario(falla);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Para cada RAC, indique las actividades con las que lo evaluará y el
        instrumento de cada una. El peso dentro del RAC es opcional.
      </p>
      {seccion.racsSinEvaluacion.length > 0 && (
        <p role="status" className="text-sm font-medium text-amber-900">
          {seccion.racsSinEvaluacion.length === 1
            ? 'Falta 1 RAC por evaluar.'
            : `Faltan ${seccion.racsSinEvaluacion.length} RAC por evaluar.`}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {aviso}
        </p>
      )}

      <ul className="space-y-4">
        {seccion.racs.map((rac) => (
          <li
            key={rac.id}
            className="space-y-3 rounded-xl border border-slate-200 p-3 sm:p-4"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{rac.codigo}</h3>
                {rac.raps.map((rap) => (
                  <Insignia key={rap}>{rap}</Insignia>
                ))}
                {sinEvaluacion.has(rac.id) && (
                  <Insignia tono="advertencia">Sin evaluación</Insignia>
                )}
              </div>
              <p className="text-sm text-slate-700">{rac.enunciado}</p>
            </div>

            {editando === rac.id ? (
              <FormularioEvaluacion
                rac={rac}
                guardar={(actividades) => guardar(rac, actividades)}
                cancelar={() => setEditando(null)}
                alCambiar={alCambiar}
              />
            ) : (
              <>
                {rac.actividades.length > 0 ? (
                  <ol className="space-y-2">
                    {rac.actividades.map((actividad, indice) => (
                      <li
                        key={actividad.id}
                        className="rounded-lg bg-slate-50 p-3 text-sm"
                      >
                        <p>
                          <span className="font-semibold">{indice + 1}.</span>{' '}
                          {actividad.actividad}
                        </p>
                        <p className="text-slate-600">
                          Instrumento: {actividad.instrumento}
                          {actividad.porcentaje !== null &&
                            ` · Peso: ${peso(actividad.porcentaje)}`}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-slate-600">
                    Sin actividades de evaluación.
                  </p>
                )}
                {rac.pesoTotal !== null && (
                  <p
                    className={`text-sm ${rac.pesoTotal > 100 ? 'font-medium text-amber-900' : 'text-slate-600'}`}
                  >
                    Peso total: {peso(rac.pesoTotal)}
                    {rac.pesoTotal > 100 && ' (supera el 100 %)'}
                  </p>
                )}
                {puedeEditar && (
                  <BotonSecundario
                    onClick={() => {
                      setAviso(null);
                      setEditando(rac.id);
                    }}
                    disabled={editando !== null}
                  >
                    {rac.actividades.length > 0
                      ? `Editar la evaluación de ${rac.codigo}`
                      : `+ Registrar la evaluación de ${rac.codigo}`}
                  </BotonSecundario>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Fila {
  clave: number;
  actividad: string;
  instrumento: string;
  /** Como lo escribe el docente; vacío es «sin peso». */
  porcentaje: string;
}

/** Lo guardado del RAC, como lo muestra el formulario. */
function filasGuardadas(rac: RacEvaluacion): Omit<Fila, 'clave'>[] {
  return rac.actividades.map((actividad) => ({
    actividad: actividad.actividad,
    instrumento: actividad.instrumento,
    porcentaje:
      actividad.porcentaje === null ? '' : String(actividad.porcentaje),
  }));
}

/** Una fila en blanco no cuenta: así se puede guardar el RAC sin actividades. */
const esLlena = (fila: Omit<Fila, 'clave'>) =>
  Boolean(
    fila.actividad.trim() || fila.instrumento.trim() || fila.porcentaje.trim(),
  );

/** Para saber si el formulario difiere de lo guardado. */
const huella = (filas: Omit<Fila, 'clave'>[]) =>
  JSON.stringify(
    filas
      .filter(esLlena)
      .map((fila) => [
        fila.actividad.trim(),
        fila.instrumento.trim(),
        fila.porcentaje.trim(),
      ]),
  );

/** Convierte «30», «30,5» o «30.5» en número; nulo si está vacío; NaN si no es válido. */
function leerPeso(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') {
    return null;
  }
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? Number(limpio) : Number.NaN;
}

function FormularioEvaluacion({
  rac,
  guardar,
  cancelar,
  alCambiar,
}: {
  rac: RacEvaluacion;
  guardar: (actividades: ActividadEvaluacion[]) => Promise<string | null>;
  cancelar: () => void;
  alCambiar: (hayCambios: boolean) => void;
}) {
  const id = useId();
  const [filas, setFilas] = useState<Fila[]>(() => {
    const guardadas = filasGuardadas(rac);
    return (
      guardadas.length > 0
        ? guardadas
        : [{ actividad: '', instrumento: '', porcentaje: '' }]
    ).map((fila) => ({ clave: nuevaClave(), ...fila }));
  });
  const [inicial] = useState(() => huella(filasGuardadas(rac)));
  const [errores, setErrores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const hayCambios = huella(filas) !== inicial;
  useEffect(() => {
    alCambiar(hayCambios);
  }, [alCambiar, hayCambios]);

  const cambiar = (clave: number, cambio: Partial<Fila>) =>
    setFilas((previas) =>
      previas.map((fila) =>
        fila.clave === clave ? { ...fila, ...cambio } : fila,
      ),
    );

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const llenas = filas.filter(esLlena);
    const faltas: string[] = [];
    const actividades: ActividadEvaluacion[] = llenas.map((fila, indice) => {
      const numero = indice + 1;
      if (!fila.actividad.trim()) {
        faltas.push(`Describa la actividad ${numero}.`);
      }
      if (!fila.instrumento.trim()) {
        faltas.push(`Indique el instrumento de la actividad ${numero}.`);
      }
      const porcentaje = leerPeso(fila.porcentaje);
      if (
        porcentaje !== null &&
        (Number.isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100)
      ) {
        faltas.push(
          `El peso de la actividad ${numero} debe ser un número mayor que 0 y hasta 100, con máximo dos decimales.`,
        );
      }
      return {
        actividad: fila.actividad.trim(),
        instrumento: fila.instrumento.trim(),
        porcentaje,
      };
    });
    setErrores(faltas);
    setError(null);
    if (faltas.length > 0) {
      return;
    }
    setGuardando(true);
    const mensaje = await guardar(actividades);
    setGuardando(false);
    if (mensaje) {
      setError(mensaje);
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label={`Evaluación de ${rac.codigo}`}
      className="space-y-3 rounded-xl border border-marca/30 bg-slate-50 p-3 sm:p-4"
    >
      <ol className="space-y-3">
        {filas.map((fila, indice) => {
          const numero = indice + 1;
          return (
            <li
              key={fila.clave}
              className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <p className="text-sm font-semibold">Actividad {numero}</p>
              <div className="space-y-1">
                <label
                  htmlFor={`${id}-actividad-${fila.clave}`}
                  className="block text-sm font-medium"
                >
                  Actividad de evaluación
                </label>
                <textarea
                  id={`${id}-actividad-${fila.clave}`}
                  value={fila.actividad}
                  maxLength={ACTIVIDAD_MAXIMO}
                  rows={2}
                  onChange={(evento) =>
                    cambiar(fila.clave, { actividad: evento.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
                <div className="space-y-1">
                  <label
                    htmlFor={`${id}-instrumento-${fila.clave}`}
                    className="block text-sm font-medium"
                  >
                    Instrumento
                  </label>
                  <input
                    id={`${id}-instrumento-${fila.clave}`}
                    value={fila.instrumento}
                    maxLength={INSTRUMENTO_MAXIMO}
                    placeholder="Rúbrica, lista de chequeo…"
                    onChange={(evento) =>
                      cambiar(fila.clave, { instrumento: evento.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`${id}-peso-${fila.clave}`}
                    className="block text-sm font-medium"
                  >
                    Peso % (opcional)
                  </label>
                  <input
                    id={`${id}-peso-${fila.clave}`}
                    value={fila.porcentaje}
                    inputMode="decimal"
                    onChange={(evento) =>
                      cambiar(fila.clave, { porcentaje: evento.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                  />
                </div>
              </div>
              <BotonSecundario
                peligro
                onClick={() =>
                  setFilas((previas) =>
                    previas.filter((f) => f.clave !== fila.clave),
                  )
                }
                etiqueta={`Quitar la actividad ${numero}`}
              >
                Quitar
              </BotonSecundario>
            </li>
          );
        })}
      </ol>
      {filas.length === 0 && (
        <p className="text-sm text-slate-600">
          Sin actividades: al guardar, {rac.codigo} quedará sin evaluación.
        </p>
      )}
      <BotonSecundario
        onClick={() =>
          setFilas((previas) => [
            ...previas,
            {
              clave: nuevaClave(),
              actividad: '',
              instrumento: '',
              porcentaje: '',
            },
          ])
        }
        disabled={filas.length >= ACTIVIDADES_MAXIMO}
      >
        + Agregar actividad
      </BotonSecundario>

      {errores.length > 0 && (
        <AvisoError
          mensaje="Revise la evaluación antes de guardarla:"
          detalles={errores}
        />
      )}
      {error && <AvisoError mensaje={error} />}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BotonSecundario onClick={cancelar} disabled={guardando}>
          Cancelar
        </BotonSecundario>
        <BotonGuardar guardando={guardando} deshabilitado={!hayCambios}>
          Guardar evaluación
        </BotonGuardar>
      </div>
    </form>
  );
}
