'use client';

import { useEffect, useId, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  cambioRechazado,
  consultarDescripcion,
  type Descripcion,
  fechaHora,
  guardarDescripcion,
} from '@/api/diligenciamiento';
import { AvisoError, Cargando } from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { BotonGuardar, ConfirmacionGuardado } from './Controles';

/**
 * Punto 2 «Descripción» (RF-11, HU-06-01): texto extenso con el propósito y el enfoque del
 * curso. Conserva los párrafos y avisa antes de superar la longitud máxima, que viene del
 * servidor (parámetro del sistema).
 */
export function SeccionDescripcion({
  idProyecto,
  puedeEditar,
  alGuardar,
  alCambiar,
}: {
  idProyecto: number;
  puedeEditar: boolean;
  alGuardar: () => void;
  alCambiar: (hayCambios: boolean) => void;
}) {
  const consulta = useConsulta(`descripcion-${idProyecto}`, (senal) =>
    consultarDescripcion(idProyecto, senal),
  );

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
  return (
    <EditorDescripcion
      idProyecto={idProyecto}
      inicial={consulta.datos}
      puedeEditar={puedeEditar}
      alGuardar={alGuardar}
      alCambiar={alCambiar}
    />
  );
}

function EditorDescripcion({
  idProyecto,
  inicial,
  puedeEditar,
  alGuardar,
  alCambiar,
}: {
  idProyecto: number;
  inicial: Descripcion;
  puedeEditar: boolean;
  alGuardar: () => void;
  alCambiar: (hayCambios: boolean) => void;
}) {
  const idCampo = useId();
  const idAyuda = useId();
  const [guardado, setGuardado] = useState(inicial);
  const [texto, setTexto] = useState(inicial.texto ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recienGuardado, setRecienGuardado] = useState(false);

  const maximo = guardado.longitudMaxima;
  const excedido = texto.length > maximo;
  const hayCambios = texto !== (guardado.texto ?? '');
  useEffect(() => {
    alCambiar(hayCambios);
  }, [alCambiar, hayCambios]);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (excedido || guardando) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await guardarDescripcion(idProyecto, texto);
      setGuardado(respuesta);
      setTexto(respuesta.texto ?? '');
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

  const ultimaModificacion = fechaHora(guardado.fechaActualizacion);

  if (!puedeEditar) {
    return (
      <div className="space-y-2">
        {guardado.texto ? (
          <p className="whitespace-pre-line text-slate-800">{guardado.texto}</p>
        ) : (
          <p className="text-sm text-slate-600">
            El docente todavía no ha redactado la descripción.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <label htmlFor={idCampo} className="block text-sm font-medium">
        Propósito y enfoque del curso
      </label>
      <p id={idAyuda} className="text-sm text-slate-600">
        Escriba en párrafos; los saltos de línea se conservan. Puede guardar y
        volver después.
      </p>
      <textarea
        id={idCampo}
        aria-describedby={`${idAyuda} ${idCampo}-contador`}
        aria-invalid={excedido}
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setRecienGuardado(false);
        }}
        rows={12}
        className={`w-full rounded-lg border px-3 py-2 text-base leading-relaxed shadow-sm focus:outline-none focus:ring-2 ${
          excedido
            ? 'border-red-400 focus:ring-red-300'
            : 'border-slate-300 focus:ring-marca/40'
        }`}
      />
      <p
        id={`${idCampo}-contador`}
        aria-live="polite"
        className={`text-right text-sm ${excedido ? 'font-semibold text-red-700' : 'text-slate-600'}`}
      >
        {texto.length.toLocaleString('es-CO')} /{' '}
        {maximo.toLocaleString('es-CO')} caracteres
        {excedido &&
          ` · sobran ${(texto.length - maximo).toLocaleString('es-CO')}`}
      </p>
      {excedido && (
        <AvisoError
          mensaje={`La descripción supera los ${maximo.toLocaleString('es-CO')} caracteres permitidos. Acórtela para poder guardarla.`}
        />
      )}
      {error && <AvisoError mensaje={error} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ConfirmacionGuardado
          visible={recienGuardado && !hayCambios}
          pendiente={hayCambios}
          ultimaModificacion={ultimaModificacion}
        />
        <BotonGuardar
          guardando={guardando}
          deshabilitado={excedido || !hayCambios}
        >
          Guardar descripción
        </BotonGuardar>
      </div>
    </form>
  );
}
