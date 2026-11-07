'use client';

import { type ReactNode, useEffect, useId, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import { cambioRechazado } from '@/api/diligenciamiento';
import { AvisoError } from '../../_componentes/Estados';
import {
  BotonGuardar,
  BotonSecundario,
  ConfirmacionGuardado,
} from './Controles';

interface Elemento {
  /** Solo para React: no cambia al reordenar ni al editar. */
  clave: number;
  texto: string;
}

let ultimaClave = 0;

/** Clave única para las filas que se editan en pantalla (`key` de React). */
export function nuevaClave(): number {
  ultimaClave += 1;
  return ultimaClave;
}

/** Para comparar como lo hace el backend: sin mayúsculas ni espacios de más. */
export function claveTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CO');
}

export interface AccionesLista {
  /** Textos que hay ahora en el listado, guardados o no. */
  textos: string[];
  /**
   * Agrega al final los textos que no estén ya, hasta el máximo. Devuelve cuántos agregó.
   */
  agregar: (textos: string[]) => number;
}

export interface Rotulos {
  /** En singular y minúscula: «estrategia», «referencia». */
  elemento: string;
  /** Texto del botón de guardar. */
  guardar: string;
  /** Qué ve quien solo consulta, si el listado está vacío. */
  vacio: string;
  /** Ayuda bajo el campo para agregar. */
  ayuda: string;
}

/**
 * Listado numerado y ordenado que se guarda completo: estrategias metodológicas (RF-13) y
 * bibliografía (RF-16). Permite agregar, editar, subir, bajar y quitar elementos antes de
 * guardar; los botones de mover sirven igual con el dedo que con el teclado. `complemento`
 * agrega formas extra de llenar el listado (catálogo sugerido, importar de otro proyecto).
 */
export function EditorLista({
  guardadoInicial,
  puedeEditar,
  maximoTexto,
  maximoElementos,
  rotulos,
  guardar,
  alGuardar,
  alCambiar,
  complemento,
}: {
  guardadoInicial: string[];
  puedeEditar: boolean;
  maximoTexto: number;
  maximoElementos: number;
  rotulos: Rotulos;
  /** Guarda el listado y devuelve el que quedó en el servidor. Lanza si falla. */
  guardar: (textos: string[]) => Promise<string[]>;
  alGuardar: () => void;
  alCambiar: (hayCambios: boolean) => void;
  complemento?: (acciones: AccionesLista) => ReactNode;
}) {
  const id = useId();
  const conClaves = (textos: string[]): Elemento[] =>
    textos.map((texto) => ({ clave: nuevaClave(), texto }));

  const [guardado, setGuardado] = useState(guardadoInicial);
  const [elementos, setElementos] = useState<Elemento[]>(() =>
    conClaves(guardadoInicial),
  );
  const [nuevo, setNuevo] = useState('');
  const [editando, setEditando] = useState<{
    clave: number;
    texto: string;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recienGuardado, setRecienGuardado] = useState(false);

  const textos = elementos.map((elemento) => elemento.texto);
  const listaCambiada = textosDistintos(textos, guardado);
  // Un borrador sin agregar también se perdería al salir.
  const hayCambios = listaCambiada || nuevo.trim() !== '' || editando !== null;
  useEffect(() => {
    alCambiar(hayCambios);
  }, [alCambiar, hayCambios]);

  const yaEsta = (texto: string, salvo?: number) =>
    elementos.some(
      (elemento) =>
        elemento.clave !== salvo &&
        claveTexto(elemento.texto) === claveTexto(texto),
    );
  const lleno = elementos.length >= maximoElementos;

  function cambiar(siguientes: Elemento[]) {
    setElementos(siguientes);
    setRecienGuardado(false);
    setError(null);
  }

  function agregar(lista: string[]): number {
    const vistas = new Set(elementos.map((e) => claveTexto(e.texto)));
    const nuevos: string[] = [];
    for (const texto of lista.map((t) => t.trim())) {
      const clave = claveTexto(texto);
      if (
        texto &&
        !vistas.has(clave) &&
        elementos.length + nuevos.length < maximoElementos
      ) {
        vistas.add(clave);
        nuevos.push(texto.slice(0, maximoTexto));
      }
    }
    if (nuevos.length > 0) {
      cambiar([...elementos, ...conClaves(nuevos)]);
    }
    return nuevos.length;
  }

  function agregarNuevo(evento: React.FormEvent) {
    evento.preventDefault();
    const texto = nuevo.trim();
    if (!texto) {
      return;
    }
    if (yaEsta(texto)) {
      setError(`Esa ${rotulos.elemento} ya está en el listado.`);
      return;
    }
    agregar([texto]);
    setNuevo('');
  }

  function mover(indice: number, paso: -1 | 1) {
    const destino = indice + paso;
    if (destino < 0 || destino >= elementos.length) {
      return;
    }
    const siguientes = [...elementos];
    [siguientes[indice], siguientes[destino]] = [
      siguientes[destino],
      siguientes[indice],
    ];
    cambiar(siguientes);
  }

  function aceptarEdicion() {
    if (!editando) {
      return;
    }
    const texto = editando.texto.trim();
    if (!texto) {
      setError(`La ${rotulos.elemento} no puede quedar vacía.`);
      return;
    }
    if (yaEsta(texto, editando.clave)) {
      setError(`Esa ${rotulos.elemento} ya está en el listado.`);
      return;
    }
    cambiar(
      elementos.map((elemento) =>
        elemento.clave === editando.clave ? { ...elemento, texto } : elemento,
      ),
    );
    setEditando(null);
  }

  async function guardarLista() {
    if (guardando) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await guardar(textos);
      setGuardado(respuesta);
      setElementos(conClaves(respuesta));
      setRecienGuardado(true);
      alGuardar();
    } catch (falla) {
      setError(mensajeParaUsuario(falla));
      if (cambioRechazado(falla)) {
        alGuardar();
      }
    } finally {
      setGuardando(false);
    }
  }

  if (!puedeEditar) {
    return guardado.length > 0 ? (
      <ol className="list-decimal space-y-2 pl-6 text-slate-800">
        {guardado.map((texto) => (
          <li key={texto} className="whitespace-pre-line pl-1">
            {texto}
          </li>
        ))}
      </ol>
    ) : (
      <p className="text-sm text-slate-600">{rotulos.vacio}</p>
    );
  }

  return (
    <div className="space-y-4">
      {elementos.length > 0 ? (
        <ol className="space-y-2">
          {elementos.map((elemento, indice) => {
            const numero = indice + 1;
            const enEdicion = editando?.clave === elemento.clave;
            return (
              <li
                key={elemento.clave}
                className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                {enEdicion ? (
                  <div className="space-y-2">
                    <label
                      htmlFor={`${id}-editar-${elemento.clave}`}
                      className="block text-sm font-medium"
                    >
                      Editar {rotulos.elemento} {numero}
                    </label>
                    <textarea
                      id={`${id}-editar-${elemento.clave}`}
                      value={editando.texto}
                      maxLength={maximoTexto}
                      rows={3}
                      onChange={(evento) =>
                        setEditando({
                          clave: elemento.clave,
                          texto: evento.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
                    />
                    <div className="flex flex-wrap gap-2">
                      <BotonSecundario onClick={aceptarEdicion}>
                        Aceptar
                      </BotonSecundario>
                      <BotonSecundario
                        onClick={() => {
                          setEditando(null);
                          setError(null);
                        }}
                      >
                        Cancelar
                      </BotonSecundario>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-line">
                    <span className="font-semibold">{numero}.</span>{' '}
                    {elemento.texto}
                  </p>
                )}
                {!enEdicion && (
                  <div className="flex flex-wrap gap-2">
                    <BotonSecundario
                      onClick={() => mover(indice, -1)}
                      disabled={indice === 0 || editando !== null}
                      etiqueta={`Subir ${rotulos.elemento} ${numero}`}
                    >
                      ↑ Subir
                    </BotonSecundario>
                    <BotonSecundario
                      onClick={() => mover(indice, 1)}
                      disabled={
                        indice === elementos.length - 1 || editando !== null
                      }
                      etiqueta={`Bajar ${rotulos.elemento} ${numero}`}
                    >
                      ↓ Bajar
                    </BotonSecundario>
                    <BotonSecundario
                      onClick={() =>
                        setEditando({
                          clave: elemento.clave,
                          texto: elemento.texto,
                        })
                      }
                      disabled={editando !== null}
                      etiqueta={`Editar ${rotulos.elemento} ${numero}`}
                    >
                      Editar
                    </BotonSecundario>
                    <BotonSecundario
                      peligro
                      onClick={() =>
                        cambiar(
                          elementos.filter((e) => e.clave !== elemento.clave),
                        )
                      }
                      disabled={editando !== null}
                      etiqueta={`Quitar ${rotulos.elemento} ${numero}`}
                    >
                      Quitar
                    </BotonSecundario>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-slate-600">
          Todavía no hay ninguna {rotulos.elemento} en el listado.
        </p>
      )}

      <form onSubmit={agregarNuevo} className="space-y-2">
        <label htmlFor={`${id}-nueva`} className="block text-sm font-medium">
          Agregar {rotulos.elemento}
        </label>
        <p id={`${id}-ayuda`} className="text-sm text-slate-600">
          {rotulos.ayuda}
        </p>
        <textarea
          id={`${id}-nueva`}
          aria-describedby={`${id}-ayuda`}
          value={nuevo}
          maxLength={maximoTexto}
          rows={2}
          disabled={lleno}
          onChange={(evento) => {
            setNuevo(evento.target.value);
            setRecienGuardado(false);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base disabled:bg-slate-100"
        />
        <BotonSecundario tipo="submit" disabled={!nuevo.trim() || lleno}>
          + Agregar al listado
        </BotonSecundario>
        {lleno && (
          <p className="text-sm text-slate-600">
            El listado llegó al máximo de {maximoElementos} elementos.
          </p>
        )}
      </form>

      {complemento?.({ textos, agregar })}

      {error && <AvisoError mensaje={error} />}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0">
        <ConfirmacionGuardado
          visible={recienGuardado && !listaCambiada}
          pendiente={listaCambiada}
          ultimaModificacion={null}
        />
        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            void guardarLista();
          }}
        >
          <BotonGuardar
            guardando={guardando}
            deshabilitado={editando !== null || !listaCambiada}
          >
            {rotulos.guardar}
          </BotonGuardar>
        </form>
      </div>
    </div>
  );
}

function textosDistintos(a: string[], b: string[]): boolean {
  return (
    a.length !== b.length || a.some((texto, indice) => texto !== b[indice])
  );
}
