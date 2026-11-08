'use client';

import { useEffect, useId, useState } from 'react';
import type { DatosGuardarRac, GrupoRac, Rac } from '@/api/diligenciamiento';
import { nombreRap } from '@/api/diligenciamiento';
import { AvisoError } from '../../_componentes/Estados';
import { BotonGuardar, BotonSecundario } from './Controles';

/** Mismos límites que valida el backend (GuardarRacDto). */
const CODIGO_MAXIMO = 30;
const ENUNCIADO_MAXIMO = 2000;
const CONTRIBUCION_MAXIMO = 1000;

interface Seleccion {
  marcado: boolean;
  contribucion: string;
}

/**
 * Registro o edición de un RAC (HU-06-02) y de los RAP a los que contribuye, uno o varios,
 * con la descripción opcional de esa contribución (HU-06-03). Solo ofrece los RAP del
 * proyecto, cada uno una vez: no hay forma de repetirlos.
 */
export function FormularioRac({
  grupos,
  rac,
  idRapInicial,
  guardar,
  cancelar,
  alCambiar,
}: {
  grupos: GrupoRac[];
  /** El RAC que se edita; sin él, se registra uno nuevo. */
  rac?: Rac;
  /** RAP desde el que se pidió agregar el RAC: llega marcado. */
  idRapInicial?: number;
  guardar: (datos: DatosGuardarRac) => Promise<string | null>;
  cancelar: () => void;
  /** Avisa si el formulario difiere de lo guardado. */
  alCambiar: (hayCambios: boolean) => void;
}) {
  const id = useId();
  const [codigo, setCodigo] = useState(rac?.codigo ?? '');
  const [enunciado, setEnunciado] = useState(rac?.enunciado ?? '');
  const [seleccion, setSeleccion] = useState<Record<number, Seleccion>>(() =>
    Object.fromEntries(
      grupos.map(({ rap }) => {
        const actual = rac?.raps.find((r) => r.idRap === rap.id);
        return [
          rap.id,
          {
            marcado: actual !== undefined || rap.id === idRapInicial,
            contribucion: actual?.descripcionContribucion ?? '',
          },
        ];
      }),
    ),
  );
  const [errores, setErrores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const marcados = grupos.filter(({ rap }) => seleccion[rap.id]?.marcado);

  // Hay cambios si algo difiere del RAC como estaba (o de un formulario vacío, si es nuevo).
  const firma = (
    c: string,
    e: string,
    raps: { idRap: number; contribucion: string }[],
  ) => JSON.stringify([c.trim(), e.trim(), raps]);
  const [firmaInicial] = useState(() =>
    firma(
      codigo,
      enunciado,
      grupos
        .filter(({ rap }) => seleccion[rap.id]?.marcado)
        .map(({ rap }) => ({
          idRap: rap.id,
          contribucion: seleccion[rap.id].contribucion.trim(),
        })),
    ),
  );
  const hayCambios =
    firma(
      codigo,
      enunciado,
      marcados.map(({ rap }) => ({
        idRap: rap.id,
        contribucion: seleccion[rap.id].contribucion.trim(),
      })),
    ) !== firmaInicial;
  useEffect(() => {
    alCambiar(hayCambios);
  }, [alCambiar, hayCambios]);

  function validar(): string[] {
    const faltas: string[] = [];
    if (!codigo.trim()) faltas.push('Escriba el código del RAC.');
    if (!enunciado.trim()) faltas.push('Escriba el enunciado del RAC.');
    if (marcados.length === 0) faltas.push('Asocie el RAC al menos a un RAP.');
    return faltas;
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const faltas = validar();
    setErrores(faltas);
    setError(null);
    if (faltas.length > 0 || guardando) {
      return;
    }
    setGuardando(true);
    const mensaje = await guardar({
      codigo: codigo.trim(),
      enunciado: enunciado.trim(),
      raps: marcados.map(({ rap }) => ({
        idRap: rap.id,
        descripcionContribucion:
          seleccion[rap.id].contribucion.trim() || undefined,
      })),
    });
    setGuardando(false);
    if (mensaje) {
      setError(mensaje);
    }
  }

  const cambiar = (idRap: number, cambio: Partial<Seleccion>) =>
    setSeleccion((previa) => ({
      ...previa,
      [idRap]: { ...previa[idRap], ...cambio },
    }));

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label={rac ? `Editar ${rac.codigo}` : 'Nuevo RAC'}
      className="space-y-4 rounded-xl border border-marca/30 bg-slate-50 p-3 sm:p-4"
    >
      <p className="font-semibold">
        {rac ? `Editar ${rac.codigo}` : 'Nuevo RAC'}
      </p>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-1">
          <label htmlFor={`${id}-codigo`} className="block text-sm font-medium">
            Código
          </label>
          <input
            id={`${id}-codigo`}
            value={codigo}
            maxLength={CODIGO_MAXIMO}
            placeholder="Ej.: RAC 1"
            onChange={(evento) => setCodigo(evento.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`${id}-enunciado`}
            className="block text-sm font-medium"
          >
            Enunciado
          </label>
          <textarea
            id={`${id}-enunciado`}
            value={enunciado}
            maxLength={ENUNCIADO_MAXIMO}
            rows={3}
            onChange={(evento) => setEnunciado(evento.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          RAP a los que contribuye
        </legend>
        <p className="text-sm text-slate-600">
          Marque uno o varios. Si contribuye a más de uno, puede explicar cómo.
        </p>
        <ul className="space-y-2">
          {grupos.map(({ rap }) => {
            const actual = seleccion[rap.id];
            return (
              <li
                key={rap.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={actual.marcado}
                    onChange={(evento) =>
                      cambiar(rap.id, { marcado: evento.target.checked })
                    }
                    className="mt-1 size-5 shrink-0 accent-marca"
                  />
                  <span>
                    <span className="font-semibold">{nombreRap(rap)}</span>
                    {rap.descripcion && (
                      <span className="block text-sm text-slate-600">
                        {rap.descripcion}
                      </span>
                    )}
                  </span>
                </label>
                {actual.marcado && (
                  <div className="mt-2 space-y-1 pl-8">
                    <label
                      htmlFor={`${id}-contribucion-${rap.id}`}
                      className="block text-sm font-medium"
                    >
                      Contribución a {nombreRap(rap)} (opcional)
                    </label>
                    <textarea
                      id={`${id}-contribucion-${rap.id}`}
                      value={actual.contribucion}
                      maxLength={CONTRIBUCION_MAXIMO}
                      rows={2}
                      onChange={(evento) =>
                        cambiar(rap.id, { contribucion: evento.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      {errores.length > 0 && (
        <AvisoError
          mensaje="Revise el RAC antes de guardarlo:"
          detalles={errores}
        />
      )}
      {error && <AvisoError mensaje={error} />}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BotonSecundario onClick={cancelar} disabled={guardando}>
          Cancelar
        </BotonSecundario>
        <BotonGuardar guardando={guardando}>Guardar RAC</BotonGuardar>
      </div>
    </form>
  );
}
