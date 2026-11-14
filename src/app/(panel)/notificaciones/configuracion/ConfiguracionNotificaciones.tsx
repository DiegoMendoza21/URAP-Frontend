'use client';

import Link from 'next/link';
import { type FormEvent, useId, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  actualizarTipoNotificacion,
  consultarConfiguracionNotificaciones,
  enviarRecordatoriosSesiones,
  type ResultadoRecordatorios,
  type TipoNotificacion,
} from '@/api/notificaciones';
import { cambiarParametro, PERMISO_PARAMETROS } from '@/api/parametros';
import { usePermisos } from '@/sesion/permisos';
import {
  AvisoError,
  Cargando,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { CUANDO_SE_GENERA, TIPOS_RECORDATORIO } from './textos';

/** Clave del parámetro de la periodicidad (HU-13-02), el mismo de la pantalla de parámetros. */
const PARAMETRO_PERIODICIDAD = 'recordatorio_sesiones_dias';

const BOTON =
  'min-h-11 rounded-lg px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-60';

/**
 * Configuración de las notificaciones (RF-26, HU-13-04): qué eventos generan aviso, cuáles
 * saldrán también por correo y cada cuánto se recuerdan las sesiones pendientes (HU-13-02).
 * Cada cambio rige desde el siguiente aviso, sin redesplegar, y queda en la auditoría. El
 * backend decide quién entra: el mismo permiso de los parámetros del sistema.
 */
export function ConfiguracionNotificaciones() {
  const tiene = usePermisos();
  const puedeAdministrar = tiene(PERMISO_PARAMETROS);
  // Sin el permiso no se consulta: el backend respondería 403.
  const consulta = useConsulta(
    puedeAdministrar ? 'configuracion-notificaciones' : null,
    consultarConfiguracionNotificaciones,
  );
  /** Los tipos ya guardados en esta visita, por código: reemplazan a los de la consulta. */
  const [guardados, setGuardados] = useState<Record<string, TipoNotificacion>>(
    {},
  );

  const tipos =
    consulta.estado === 'lista'
      ? consulta.datos.tipos.map((tipo) => guardados[tipo.codigo] ?? tipo)
      : [];
  const recordatorio = tipos.filter((tipo) =>
    TIPOS_RECORDATORIO.includes(tipo.codigo),
  );
  const otros = tipos.filter(
    (tipo) => !TIPOS_RECORDATORIO.includes(tipo.codigo),
  );
  const alGuardar = (tipo: TipoNotificacion) =>
    setGuardados((previos) => ({ ...previos, [tipo.codigo]: tipo }));

  return (
    <section aria-labelledby="titulo-configuracion" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/configuracion"
          className="relative inline-block text-sm font-medium text-marca after:absolute after:inset-x-0 after:-inset-y-3 hover:underline"
        >
          ← Configuración
        </Link>
        <h1
          id="titulo-configuracion"
          className="text-2xl font-bold sm:text-3xl"
        >
          Configuración de notificaciones
        </h1>
        <p className="text-slate-700">
          Elija qué eventos le dejan un aviso a cada persona en su campana de
          notificaciones. Cada cambio rige desde el siguiente aviso y queda en
          el registro de auditoría.
        </p>
      </div>

      {!puedeAdministrar && (
        <AvisoError mensaje="Sus roles no tienen permiso para configurar las notificaciones." />
      )}
      {consulta.estado === 'cargando' && <Cargando />}
      {consulta.estado === 'fallida' && (
        <AvisoError
          mensaje={consulta.mensaje}
          reintentar={consulta.reintentable ? consulta.reintentar : undefined}
        />
      )}

      {consulta.estado === 'lista' && (
        <>
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            El correo todavía no sale: el sistema no tiene aún el servicio de
            correo institucional. Lo que elija en «Enviar también por correo» se
            aplicará cuando lo tenga. Mientras tanto, todos los avisos llegan a
            la campana.
          </p>

          <section aria-labelledby="titulo-recordatorio" className="space-y-3">
            <h2 id="titulo-recordatorio" className="text-xl font-semibold">
              Recordatorio de sesiones pendientes
            </h2>
            <p className="text-slate-700">
              El sistema revisa todos los días a las 7:00 de la mañana qué
              docentes tienen clases vencidas o por vencer sin registrar, y le
              deja a cada uno un solo aviso con todos sus cursos.
            </p>
            <Periodicidad dias={consulta.datos.recordatorioSesionesDias} />
            {recordatorio.map((tipo) => (
              <TarjetaTipo
                key={tipo.codigo}
                tipo={tipo}
                alGuardar={alGuardar}
              />
            ))}
            <EnviarAhora />
          </section>

          <section aria-labelledby="titulo-avisos" className="space-y-3">
            <h2 id="titulo-avisos" className="text-xl font-semibold">
              Avisos del proyecto docente y del sistema
            </h2>
            {otros.map((tipo) => (
              <TarjetaTipo
                key={tipo.codigo}
                tipo={tipo}
                alGuardar={alGuardar}
              />
            ))}
          </section>
        </>
      )}
    </section>
  );
}

/** HU-13-02: cada cuántos días le llega el recordatorio a un mismo docente. */
function Periodicidad({ dias }: { dias: number | null }) {
  const id = useId();
  const [valor, setValor] = useState(dias === null ? '' : String(dias));
  const [guardado, setGuardado] = useState(dias);
  const [estado, setEstado] = useState<
    | { tipo: 'quieto' }
    | { tipo: 'guardando' }
    | { tipo: 'guardado' }
    | { tipo: 'error'; mensaje: string }
  >({ tipo: 'quieto' });
  const sinCambios = valor.trim() === String(guardado ?? '');

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setEstado({ tipo: 'guardando' });
    try {
      const parametro = await cambiarParametro(PARAMETRO_PERIODICIDAD, {
        valor: valor.trim(),
      });
      setGuardado(Number(parametro.valor));
      setValor(parametro.valor ?? valor.trim());
      setEstado({ tipo: 'guardado' });
    } catch (fallo) {
      setEstado({ tipo: 'error', mensaje: mensajeParaUsuario(fallo) });
    }
  }

  return (
    <form
      onSubmit={(evento) => void guardar(evento)}
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label htmlFor={`${id}-dias`} className="block font-semibold">
        Cada cuántos días se le recuerda a un mismo docente
      </label>
      {dias === null && (
        <p className="text-sm text-red-700">
          La periodicidad falta o no es válida, así que el recordatorio no se
          está enviando. Escriba un número de días y guárdelo.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`${id}-dias`}
          type="number"
          inputMode="numeric"
          // Sin `min`: el backend valida el rango y su mensaje sale en español.
          value={valor}
          onChange={(evento) => {
            setValor(evento.target.value);
            setEstado({ tipo: 'quieto' });
          }}
          aria-invalid={estado.tipo === 'error' ? true : undefined}
          aria-describedby={`${id}-ayuda${estado.tipo === 'error' ? ` ${id}-error` : ''}`}
          className="min-h-11 w-24 rounded-lg border border-slate-300 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-marca aria-[invalid=true]:border-red-500"
        />
        <span>días</span>
        <button
          type="submit"
          disabled={sinCambios || estado.tipo === 'guardando'}
          className={`${BOTON} bg-marca text-white`}
        >
          {estado.tipo === 'guardando' ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      <p id={`${id}-ayuda`} className="text-sm text-slate-600">
        Con 7, quien recibió el recordatorio el jueves vuelve a recibirlo el
        jueves siguiente si todavía tiene clases pendientes.
      </p>
      {estado.tipo === 'error' && (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {estado.mensaje}
        </p>
      )}
      <p role="status" className="text-sm text-green-800">
        {estado.tipo === 'guardado' ? 'Periodicidad guardada.' : ''}
      </p>
    </form>
  );
}

/** Un tipo de notificación con sus dos interruptores. Cada cambio se guarda al tocarlo. */
function TarjetaTipo({
  tipo,
  alGuardar,
}: {
  tipo: TipoNotificacion;
  alGuardar: (tipo: TipoNotificacion) => void;
}) {
  const id = useId();
  const [guardando, setGuardando] = useState<'activo' | 'enviaEmail' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  async function cambiar(campo: 'activo' | 'enviaEmail') {
    setGuardando(campo);
    setError(null);
    setAviso('');
    try {
      const guardado = await actualizarTipoNotificacion(tipo.codigo, {
        [campo]: !tipo[campo],
      });
      alGuardar(guardado);
      setAviso(
        campo === 'activo'
          ? `${guardado.nombre}: ${guardado.activo ? 'se genera' : 'ya no se genera'}.`
          : `${guardado.nombre}: ${guardado.enviaEmail ? 'saldrá también por correo' : 'no saldrá por correo'}.`,
      );
    } catch (fallo) {
      setError(mensajeParaUsuario(fallo));
    } finally {
      setGuardando(null);
    }
  }

  return (
    <article
      aria-labelledby={`${id}-nombre`}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="space-y-1">
        <h3 id={`${id}-nombre`} className="font-semibold">
          {tipo.nombre}
        </h3>
        {CUANDO_SE_GENERA[tipo.codigo] && (
          <p className="text-sm text-slate-700">
            {CUANDO_SE_GENERA[tipo.codigo]}
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Interruptor
          etiqueta="Generar este aviso"
          encendido={tipo.activo}
          ocupado={guardando === 'activo'}
          deshabilitado={guardando !== null}
          alCambiar={() => void cambiar('activo')}
        />
        <Interruptor
          etiqueta="Enviar también por correo"
          encendido={tipo.enviaEmail}
          ocupado={guardando === 'enviaEmail'}
          deshabilitado={guardando !== null || !tipo.activo}
          alCambiar={() => void cambiar('enviaEmail')}
        />
      </div>
      {error && <AvisoError mensaje={error} />}
      <p role="status" className="sr-only">
        {aviso}
      </p>
    </article>
  );
}

/**
 * Interruptor de sí o no, del mismo estilo que el de los parámetros. Toda la fila es el botón:
 * mide al menos 44 px de alto para el dedo.
 */
function Interruptor({
  etiqueta,
  encendido,
  ocupado,
  deshabilitado,
  alCambiar,
}: {
  etiqueta: string;
  encendido: boolean;
  ocupado: boolean;
  deshabilitado: boolean;
  alCambiar: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-busy={ocupado || undefined}
      disabled={deshabilitado}
      onClick={alCambiar}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-60"
    >
      <span className="text-sm font-medium">{etiqueta}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
          encendido ? 'bg-marca' : 'bg-slate-400'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
            encendido ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

/** HU-13-02: envía ya el recordatorio, sin esperar a la revisión de las 7:00. */
function EnviarAhora() {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoRecordatorios | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(await enviarRecordatoriosSesiones());
    } catch (fallo) {
      setError(mensajeParaUsuario(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-700">
        Para no esperar a la revisión de mañana, puede enviarlo ahora. Quien ya
        lo recibió dentro de la periodicidad no lo recibe otra vez.
      </p>
      <button
        type="button"
        onClick={() => void enviar()}
        disabled={enviando}
        className={`${BOTON} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100`}
      >
        {enviando ? 'Enviando…' : 'Enviar recordatorios ahora'}
      </button>
      {error && <AvisoError mensaje={error} />}
      <p role="status" className="text-sm text-slate-800">
        {resultado ? textoResultado(resultado) : ''}
      </p>
    </div>
  );
}

function textoResultado(resultado: ResultadoRecordatorios): string {
  if (resultado.periodicidadDias === null) {
    return 'No se envió ningún recordatorio: la periodicidad falta o no es válida.';
  }
  if (resultado.docentesConPendientes === 0) {
    return 'Ningún docente tiene clases vencidas o por vencer: no hay nada que recordar.';
  }
  const frases = [
    resultado.enviados === 0
      ? 'No se envió ningún recordatorio.'
      : resultado.enviados === 1
        ? 'Se envió 1 recordatorio.'
        : `Se enviaron ${resultado.enviados} recordatorios.`,
  ];
  if (resultado.omitidosPorPeriodicidad > 0) {
    frases.push(
      resultado.omitidosPorPeriodicidad === 1
        ? `1 docente ya lo había recibido en los últimos ${resultado.periodicidadDias} días.`
        : `${resultado.omitidosPorPeriodicidad} docentes ya lo habían recibido en los últimos ${resultado.periodicidadDias} días.`,
    );
  }
  if (resultado.omitidosPorTipoInactivo > 0) {
    frases.push(
      resultado.omitidosPorTipoInactivo === 1
        ? '1 docente no lo recibió porque su tipo de recordatorio está apagado.'
        : `${resultado.omitidosPorTipoInactivo} docentes no lo recibieron porque su tipo de recordatorio está apagado.`,
    );
  }
  return frases.join(' ');
}
