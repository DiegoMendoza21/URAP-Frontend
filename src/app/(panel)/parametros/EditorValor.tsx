'use client';

import { type RefObject, useState } from 'react';
import type { Parametro } from '@/api/parametros';
import { BotonSecundario } from '../proyectos-docentes/[id]/diligenciar/Controles';
import { type Borrador, type Fila, nuevaFila } from './borrador';
import { formatoNumero, type TextoParametro } from './textos';

const CAMPO =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-marca aria-[invalid=true]:border-red-500';

/**
 * El campo para editar un parámetro, según su tipo (HU-03-07): un número, un interruptor de sí
 * o no, o una lista con un elemento por renglón que se puede ordenar. `idError` es el aviso que
 * está junto al campo, si lo hay.
 */
export function EditorValor({
  id,
  parametro,
  texto,
  borrador,
  alCambiar,
  idError,
  primerCampo,
}: {
  id: string;
  parametro: Parametro;
  texto: TextoParametro;
  borrador: Borrador;
  alCambiar: (borrador: Borrador) => void;
  idError?: string;
  /** El control que recibe el foco al empezar a editar. */
  primerCampo: RefObject<HTMLInputElement | HTMLButtonElement | null>;
}) {
  switch (borrador.tipo) {
    case 'entero': {
      const { minimo, maximo } = parametro;
      const ayuda =
        minimo !== null && maximo !== null
          ? `Un número entero entre ${formatoNumero(minimo)} y ${formatoNumero(maximo)}.`
          : 'Un número entero.';
      return (
        <div className="space-y-1">
          <label htmlFor={`${id}-valor`} className="block text-sm font-medium">
            {texto.titulo}
            {texto.unidad ? ` (${texto.unidad[1]})` : ''}
          </label>
          <input
            ref={primerCampo as RefObject<HTMLInputElement | null>}
            id={`${id}-valor`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={12}
            value={borrador.texto}
            onChange={(evento) =>
              alCambiar({ tipo: 'entero', texto: evento.target.value })
            }
            aria-invalid={idError ? true : undefined}
            aria-describedby={`${id}-ayuda${idError ? ` ${idError}` : ''}`}
            className={`${CAMPO} sm:max-w-40`}
          />
          <p id={`${id}-ayuda`} className="text-sm text-slate-600">
            {ayuda}
          </p>
        </div>
      );
    }
    case 'booleano':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              ref={primerCampo as RefObject<HTMLButtonElement | null>}
              type="button"
              role="switch"
              aria-checked={borrador.encendido}
              aria-labelledby={`${id}-titulo`}
              aria-describedby={`${id}-efecto${idError ? ` ${idError}` : ''}`}
              onClick={() =>
                alCambiar({ tipo: 'booleano', encendido: !borrador.encendido })
              }
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca ${
                borrador.encendido ? 'bg-marca' : 'bg-slate-400'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  borrador.encendido ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="font-semibold">
              {borrador.encendido ? 'Encendido' : 'Apagado'}
            </span>
          </div>
          <p id={`${id}-efecto`} className="text-sm text-slate-700">
            {(borrador.encendido ? texto.encendido : texto.apagado) ?? ''}
          </p>
        </div>
      );
    case 'lista':
      return (
        <EditorFilas
          id={id}
          parametro={parametro}
          texto={texto}
          borrador={borrador}
          alCambiar={alCambiar}
          idError={idError}
          primerCampo={primerCampo as RefObject<HTMLInputElement | null>}
        />
      );
  }
}

/**
 * Lista con un elemento por renglón: se edita cada uno en su sitio, se sube, se baja o se quita,
 * y se agregan nuevos al final. Los botones sirven igual con el dedo que con el teclado.
 */
function EditorFilas({
  id,
  parametro,
  texto,
  borrador,
  alCambiar,
  idError,
  primerCampo,
}: {
  id: string;
  parametro: Parametro;
  texto: TextoParametro;
  borrador: Extract<Borrador, { tipo: 'lista' }>;
  alCambiar: (borrador: Borrador) => void;
  idError?: string;
  primerCampo: RefObject<HTMLInputElement | null>;
}) {
  // Lo que se le anuncia al lector de pantalla tras mover o quitar un renglón.
  const [anuncio, setAnuncio] = useState('');
  const elemento = texto.elemento ?? 'elemento';
  const { filas, nuevo } = borrador;
  const conFilas = (siguientes: Fila[], pendiente = nuevo) =>
    alCambiar({ tipo: 'lista', filas: siguientes, nuevo: pendiente });

  function mover(indice: number, salto: -1 | 1) {
    const destino = indice + salto;
    const siguientes = [...filas];
    [siguientes[indice], siguientes[destino]] = [
      siguientes[destino],
      siguientes[indice],
    ];
    conFilas(siguientes);
    setAnuncio(
      `«${filas[indice].texto}» pasó al renglón ${destino + 1} de ${filas.length}.`,
    );
  }

  function quitar(indice: number) {
    conFilas(filas.filter((_, posicion) => posicion !== indice));
    setAnuncio(`Se quitó «${filas[indice].texto}».`);
  }

  function agregar() {
    const limpio = nuevo.trim();
    if (limpio === '') {
      return;
    }
    conFilas([...filas, nuevaFila(limpio)], '');
    setAnuncio(`Se agregó «${limpio}» al final de la lista.`);
  }

  return (
    <div className="space-y-3">
      {filas.length === 0 ? (
        <p className="text-sm text-slate-600">La lista está vacía.</p>
      ) : (
        <ol className="space-y-2" aria-label={texto.titulo}>
          {filas.map((fila, indice) => {
            const numero = indice + 1;
            return (
              <li
                key={fila.clave}
                className="space-y-2 rounded-lg border border-slate-200 bg-white p-2 sm:flex sm:items-center sm:gap-2 sm:space-y-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-6 shrink-0 text-right text-sm text-slate-600"
                  >
                    {numero}.
                  </span>
                  <input
                    ref={indice === 0 ? primerCampo : undefined}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="off"
                    maxLength={255}
                    value={fila.texto}
                    onChange={(evento) =>
                      conFilas(
                        filas.map((otra) =>
                          otra.clave === fila.clave
                            ? { ...otra, texto: evento.target.value }
                            : otra,
                        ),
                      )
                    }
                    aria-label={`${elemento} ${numero}`}
                    aria-invalid={idError ? true : undefined}
                    aria-describedby={idError}
                    className={CAMPO}
                  />
                </div>
                <div className="flex shrink-0 gap-2 pl-8 sm:pl-0">
                  <BotonSecundario
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    etiqueta={`Subir ${elemento} ${numero}`}
                  >
                    ↑ Subir
                  </BotonSecundario>
                  <BotonSecundario
                    onClick={() => mover(indice, 1)}
                    disabled={indice === filas.length - 1}
                    etiqueta={`Bajar ${elemento} ${numero}`}
                  >
                    ↓ Bajar
                  </BotonSecundario>
                  <BotonSecundario
                    peligro
                    onClick={() => quitar(indice)}
                    etiqueta={`Quitar ${elemento} ${numero}`}
                  >
                    Quitar
                  </BotonSecundario>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-1">
        <label htmlFor={`${id}-nuevo`} className="block text-sm font-medium">
          Agregar {elemento}
        </label>
        <div className="flex gap-2">
          <input
            ref={filas.length === 0 ? primerCampo : undefined}
            id={`${id}-nuevo`}
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            maxLength={255}
            value={nuevo}
            onChange={(evento) => conFilas(filas, evento.target.value)}
            onKeyDown={(evento) => {
              // Intro agrega el renglón; no envía el formulario a medio escribir.
              if (evento.key === 'Enter') {
                evento.preventDefault();
                agregar();
              }
            }}
            aria-describedby={`${id}-ayuda`}
            className={CAMPO}
          />
          <BotonSecundario onClick={agregar} disabled={nuevo.trim() === ''}>
            Agregar
          </BotonSecundario>
        </div>
        <p id={`${id}-ayuda`} className="text-sm text-slate-600">
          {parametro.elementosPermitidos
            ? `Puede elegir entre: ${parametro.elementosPermitidos.join(', ')}. `
            : ''}
          Un elemento no puede llevar coma ni repetirse.
          {parametro.admiteVacia
            ? ' La lista puede quedar vacía.'
            : ' La lista no puede quedar vacía.'}
        </p>
      </div>
      <p role="status" className="sr-only">
        {anuncio}
      </p>
    </div>
  );
}
