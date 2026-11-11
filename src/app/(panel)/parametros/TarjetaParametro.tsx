'use client';

import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import { cambiarParametro, type Parametro } from '@/api/parametros';
import { Insignia } from '../proyectos-docentes/_componentes/Estados';
import { momento } from '../proyectos-docentes/_componentes/fechas';
import {
  type Borrador,
  borradorDe,
  hayCambios,
  preparar,
  type Preparado,
} from './borrador';
import { EditorValor } from './EditorValor';
import { type TextoParametro, valorConUnidad } from './textos';

const BOTON_PRINCIPAL =
  'w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2';
const BOTON_NEUTRO =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold disabled:opacity-50 sm:w-auto sm:py-2';

/**
 * Un parámetro del sistema (HU-03-07): su explicación, su valor y, al editarlo, el campo que
 * corresponde a su tipo. Antes de guardar pide confirmación dentro de la página, con la misma
 * forma que aprobar o devolver un proyecto docente (URAP-124). Si el backend rechaza el valor,
 * su mensaje queda junto al campo y lo escrito no se pierde.
 */
export function TarjetaParametro({
  parametro,
  texto,
  alGuardar,
}: {
  parametro: Parametro;
  texto: TextoParametro;
  alGuardar: (guardado: Parametro) => void;
}) {
  const id = useId();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  /** El cambio que espera confirmación; nulo mientras no se pulse «Guardar». */
  const [porConfirmar, setPorConfirmar] = useState<Preparado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<{
    mensaje: string;
    detalles?: string[];
  } | null>(null);
  const [recienGuardado, setRecienGuardado] = useState(false);

  // El foco sigue a lo que aparece: al campo cuando se empieza a editar o se cancela la
  // confirmación, y al botón «Editar» cuando la edición termina (teclado y lector de pantalla).
  const botonEditar = useRef<HTMLButtonElement>(null);
  const primerCampo = useRef<HTMLInputElement | HTMLButtonElement>(null);
  const enfocar = useRef<'campo' | 'editar' | null>(null);
  useEffect(() => {
    if (enfocar.current === 'campo') {
      primerCampo.current?.focus();
    } else if (enfocar.current === 'editar') {
      botonEditar.current?.focus();
    }
    enfocar.current = null;
  });

  const editando = borrador !== null;
  const idError = error ? `${id}-error` : undefined;

  function empezar() {
    setBorrador(borradorDe(parametro));
    setError(null);
    setRecienGuardado(false);
    enfocar.current = 'campo';
  }

  function cancelar() {
    setBorrador(null);
    setPorConfirmar(null);
    setError(null);
    enfocar.current = 'editar';
  }

  function pedirConfirmacion(evento: FormEvent) {
    evento.preventDefault();
    if (borrador === null) {
      return;
    }
    const preparado = preparar(parametro, texto, borrador);
    if (preparado.error !== undefined) {
      setError({ mensaje: preparado.error });
      enfocar.current = 'campo';
      return;
    }
    setError(null);
    setPorConfirmar(preparado);
  }

  async function guardar(preparado: Preparado) {
    if (preparado.cambio === undefined) {
      return;
    }
    setGuardando(true);
    try {
      const guardado = await cambiarParametro(
        parametro.clave,
        preparado.cambio,
      );
      alGuardar(guardado);
      setBorrador(null);
      setRecienGuardado(true);
      enfocar.current = 'editar';
    } catch (causa) {
      // El borrador se conserva: el aviso queda junto al campo para corregirlo.
      setError({
        mensaje: mensajeParaUsuario(causa),
        detalles: causa instanceof ErrorApi ? causa.detalles : undefined,
      });
      enfocar.current = 'campo';
    } finally {
      setGuardando(false);
      setPorConfirmar(null);
    }
  }

  return (
    <article
      aria-labelledby={`${id}-titulo`}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h3 id={`${id}-titulo`} className="text-lg font-semibold">
          {texto.titulo}
        </h3>
        {texto.explicacion && (
          <p className="text-sm text-slate-700">{texto.explicacion}</p>
        )}
      </div>

      {!editando && (
        <>
          <ValorActual parametro={parametro} texto={texto} />
          <p className="text-sm text-slate-600">
            {parametro.actualizadoPor && parametro.actualizadoEn
              ? `Último cambio: ${momento(parametro.actualizadoEn)}, por ${parametro.actualizadoPor}.`
              : parametro.valor === null
                ? ''
                : 'Conserva el valor inicial.'}
          </p>
          {recienGuardado && (
            <p role="status" className="text-sm font-medium text-emerald-700">
              Cambio guardado. Ya rige para todo el sistema.
            </p>
          )}
          <button
            ref={botonEditar}
            type="button"
            onClick={empezar}
            aria-label={`Editar: ${texto.titulo}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Editar
          </button>
        </>
      )}

      {editando && (
        <form onSubmit={pedirConfirmacion} noValidate className="space-y-3">
          <fieldset disabled={porConfirmar !== null} className="space-y-3">
            <legend className="sr-only">Valor nuevo de {texto.titulo}</legend>
            <EditorValor
              id={id}
              parametro={parametro}
              texto={texto}
              borrador={borrador}
              alCambiar={(siguiente) => {
                setBorrador(siguiente);
                setError(null);
              }}
              idError={idError}
              primerCampo={primerCampo}
            />
          </fieldset>
          {error && (
            <div
              id={idError}
              role="alert"
              className="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              <p>{error.mensaje}</p>
              {error.detalles && error.detalles.length > 0 && (
                <ul className="list-disc pl-5">
                  {error.detalles.map((detalle) => (
                    <li key={detalle}>{detalle}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {porConfirmar === null ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={!hayCambios(parametro, borrador)}
                className={BOTON_PRINCIPAL}
              >
                Guardar
              </button>
              <button type="button" onClick={cancelar} className={BOTON_NEUTRO}>
                Cancelar
              </button>
            </div>
          ) : (
            <ConfirmarCambio
              pregunta={porConfirmar.pregunta ?? ''}
              guardando={guardando}
              alConfirmar={() => void guardar(porConfirmar)}
              alCancelar={() => {
                setPorConfirmar(null);
                enfocar.current = 'campo';
              }}
            />
          )}
        </form>
      )}
    </article>
  );
}

/** El valor guardado, como lo lee una persona: con su unidad, encendido o apagado, o la lista. */
function ValorActual({
  parametro,
  texto,
}: {
  parametro: Parametro;
  texto: TextoParametro;
}) {
  if (parametro.valor === null) {
    return (
      <p className="text-sm text-amber-900">
        <Insignia tono="advertencia">Sin configurar</Insignia> Este parámetro
        todavía no tiene valor en el sistema. Edítelo para fijarlo.
      </p>
    );
  }
  switch (parametro.tipoDato) {
    case 'entero':
      return (
        <p className="text-2xl font-bold text-marca">
          {valorConUnidad(parametro.valor, texto)}
        </p>
      );
    case 'booleano': {
      const encendido = parametro.valor === 'si';
      return (
        <div className="space-y-1">
          <Insignia tono={encendido ? 'marca' : 'neutro'}>
            {encendido ? 'Encendido' : 'Apagado'}
          </Insignia>
          <p className="text-sm text-slate-700">
            {(encendido ? texto.encendido : texto.apagado) ?? ''}
          </p>
        </div>
      );
    }
    case 'lista': {
      if (parametro.elementos.length === 0) {
        return <p className="text-sm text-slate-600">La lista está vacía.</p>;
      }
      // Las extensiones caben como etiquetas; los nombres largos van uno por renglón.
      const cortos = parametro.elementos.every(
        (elemento) => elemento.length <= 10,
      );
      return cortos ? (
        <ul className="flex flex-wrap gap-1.5">
          {parametro.elementos.map((elemento) => (
            <li key={elemento}>
              <Insignia>{elemento}</Insignia>
            </li>
          ))}
        </ul>
      ) : (
        <ol className="list-decimal space-y-0.5 pl-6 text-sm text-slate-800">
          {parametro.elementos.map((elemento) => (
            <li key={elemento}>{elemento}</li>
          ))}
        </ol>
      );
    }
  }
}

/**
 * Confirmación dentro de la página, la misma forma que la de aprobar o devolver un proyecto
 * (URAP-124): en el teléfono se ve igual en todos los navegadores. Cancelar no borra lo escrito.
 */
function ConfirmarCambio({
  pregunta,
  guardando,
  alConfirmar,
  alCancelar,
}: {
  pregunta: string;
  guardando: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  const id = useId();
  // El botón «Guardar» desaparece al abrir la confirmación: el foco pasa al «Sí, …».
  const botonSi = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botonSi.current?.focus();
  }, []);
  return (
    <div
      role="alertdialog"
      aria-labelledby={`${id}-confirmar`}
      className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-3"
    >
      <p id={`${id}-confirmar`} className="text-sm">
        {pregunta} El cambio rige de inmediato para todas las personas que usan
        el sistema y queda en el registro de auditoría.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          ref={botonSi}
          type="button"
          disabled={guardando}
          onClick={alConfirmar}
          className={BOTON_PRINCIPAL}
        >
          {guardando ? 'Guardando…' : 'Sí, guardar el cambio'}
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={alCancelar}
          className={BOTON_NEUTRO}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
