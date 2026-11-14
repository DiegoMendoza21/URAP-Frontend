'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  cargarFestivosDeLey,
  consultarFestivos,
  crearFestivo,
  editarFestivo,
  eliminarFestivo,
  type Festivo,
  type ListaFestivos,
  nombreOrigen,
  ORIGENES,
  type OrigenFestivo,
  textoRecalculo,
} from '@/api/festivos';
import { PERMISO_PARAMETROS } from '@/api/parametros';
import { usePermisos } from '@/sesion/permisos';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../proyectos-docentes/_componentes/Estados';
import { fechaLarga } from '../proyectos-docentes/_componentes/fechas';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';

/** El año en curso en Colombia: es el que el administrador revisa casi siempre. */
function anioActual(): number {
  return Number(
    new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      timeZone: 'America/Bogota',
    }).format(new Date()),
  );
}

/** Los mismos límites que valida el backend. */
const ANIO_MINIMO = 2000;
const ANIO_MAXIMO = 2100;
const NOMBRE_MAXIMO = 255;

interface Fallo {
  mensaje: string;
  detalles?: string[];
}

function falloDe(error: unknown): Fallo {
  return {
    mensaje: mensajeParaUsuario(error),
    detalles: error instanceof ErrorApi ? error.detalles : undefined,
  };
}

const CLASE_CAMPO =
  'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base';
const CLASE_PRIMARIO =
  'min-h-12 rounded-lg bg-marca px-4 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60';
const CLASE_SECUNDARIO =
  'min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60';

/**
 * Días festivos (RF-19, HU-08-01): la tabla de días sin clase por año con que el sistema marca
 * los festivos en los calendarios y reconoce el receso. El backend decide quién entra (el
 * permiso de administrar la estructura académica), calcula los festivos de ley y, tras cada
 * cambio, recalcula los calendarios de los períodos abiertos sin tocar lo diligenciado.
 */
export function DiasFestivos() {
  const tiene = usePermisos();
  const puedeAdministrar = tiene(PERMISO_PARAMETROS);
  const [anio, setAnio] = useState(anioActual);
  // Cambia después de cada cambio, para volver a cargar del servidor.
  const [version, setVersion] = useState(0);
  const [hecho, setHecho] = useState<string | null>(null);
  // Sin el permiso no se consulta: el backend respondería 403.
  const consulta = useConsulta(
    puedeAdministrar ? `festivos-${anio}-${version}` : null,
    (senal) => consultarFestivos(anio, senal),
  );

  function alCambiar(mensaje: string) {
    setHecho(mensaje);
    setVersion((valor) => valor + 1);
  }

  function irAlAnio(nuevo: number) {
    setAnio(nuevo);
    setHecho(null);
  }

  return (
    <section aria-labelledby="titulo-festivos" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/configuracion"
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
        >
          ← Configuración
        </Link>
        <h1 id="titulo-festivos" className="text-2xl font-bold sm:text-3xl">
          Días festivos
        </h1>
        <p className="text-slate-700">
          Los días sin clase de cada año: los festivos de ley y los de la
          Universidad, como el receso. El calendario de sesiones los marca solo
          y, si cambian, se recalcula sin tocar las clases ya registradas.
        </p>
      </div>

      {!puedeAdministrar && (
        <AvisoError mensaje="Sus roles no tienen permiso para administrar los días festivos." />
      )}

      {puedeAdministrar && (
        <>
          <nav
            aria-label="Año"
            className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
          >
            <button
              type="button"
              onClick={() => irAlAnio(anio - 1)}
              disabled={anio <= ANIO_MINIMO}
              className={CLASE_SECUNDARIO}
              aria-label={`Ver ${anio - 1}`}
            >
              ← {anio - 1}
            </button>
            <p aria-live="polite" className="text-2xl font-bold tabular-nums">
              {anio}
            </p>
            <button
              type="button"
              onClick={() => irAlAnio(anio + 1)}
              disabled={anio >= ANIO_MAXIMO}
              className={CLASE_SECUNDARIO}
              aria-label={`Ver ${anio + 1}`}
            >
              {anio + 1} →
            </button>
          </nav>

          {hecho && (
            <p
              role="status"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-950"
            >
              {hecho}
            </p>
          )}

          {consulta.estado === 'cargando' && <Cargando />}
          {consulta.estado === 'fallida' && (
            <AvisoError
              mensaje={consulta.mensaje}
              reintentar={
                consulta.reintentable ? consulta.reintentar : undefined
              }
            />
          )}
          {consulta.estado === 'lista' && (
            <>
              <CargaDeLey lista={consulta.datos} alCambiar={alCambiar} />
              <NuevoDia
                key={`nuevo-${anio}-${version}`}
                anio={anio}
                alCambiar={alCambiar}
              />
              <ListaDias lista={consulta.datos} alCambiar={alCambiar} />
            </>
          )}
        </>
      )}
    </section>
  );
}

/** Si al año le faltan festivos de ley, se ofrecen calculados (Ley 51 de 1983). */
function CargaDeLey({
  lista,
  alCambiar,
}: {
  lista: ListaFestivos;
  alCambiar: (mensaje: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  if (lista.faltantesDeLey === 0) {
    return null;
  }
  const todos = lista.faltantesDeLey === lista.festivosDeLey;

  async function cargar() {
    setEnviando(true);
    setFallo(null);
    try {
      const resultado = await cargarFestivosDeLey(lista.anio);
      alCambiar(
        `Se agregaron ${resultado.creados} ${resultado.creados === 1 ? 'festivo' : 'festivos'} de ley de ${resultado.anio}.${textoRecalculo(resultado.calendariosRecalculados)}`,
      );
    } catch (error) {
      setFallo(falloDe(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Advertencia
      titulo={
        todos
          ? `${lista.anio} no tiene cargados los festivos de ley`
          : `A ${lista.anio} le ${lista.faltantesDeLey === 1 ? 'falta 1 festivo' : `faltan ${lista.faltantesDeLey} festivos`} de ley`
      }
    >
      <p>
        El sistema los calcula según la Ley 51 de 1983, con los traslados al
        lunes y los que dependen de la Semana Santa. Los días que ya están en la
        tabla no se modifican.
      </p>
      {fallo && (
        <AvisoError mensaje={fallo.mensaje} detalles={fallo.detalles} />
      )}
      <button
        type="button"
        onClick={() => void cargar()}
        disabled={enviando}
        className="min-h-11 w-full rounded-lg bg-amber-700 px-4 font-semibold text-white hover:bg-amber-800 disabled:opacity-60 sm:w-auto"
      >
        {enviando ? 'Cargando…' : `Cargar los festivos de ley de ${lista.anio}`}
      </button>
    </Advertencia>
  );
}

/** Campos de un día sin clase, para agregarlo o editarlo. */
function CamposDia({
  anio,
  fecha,
  nombre,
  origen,
  cambiarFecha,
  cambiarNombre,
  cambiarOrigen,
  prefijo,
}: {
  anio: number;
  fecha: string;
  nombre: string;
  origen: OrigenFestivo;
  cambiarFecha: (valor: string) => void;
  cambiarNombre: (valor: string) => void;
  cambiarOrigen: (valor: OrigenFestivo) => void;
  prefijo: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
      <label className="block space-y-1">
        <span className="block text-sm font-semibold">Fecha</span>
        <input
          id={`${prefijo}-fecha`}
          type="date"
          required
          min={`${anio}-01-01`}
          max={`${anio}-12-31`}
          value={fecha}
          onChange={(evento) => cambiarFecha(evento.target.value)}
          className={CLASE_CAMPO}
        />
      </label>
      <label className="block space-y-1">
        <span className="block text-sm font-semibold">Nombre</span>
        <input
          type="text"
          required
          maxLength={NOMBRE_MAXIMO}
          autoComplete="off"
          placeholder="Por ejemplo: receso institucional"
          value={nombre}
          onChange={(evento) => cambiarNombre(evento.target.value)}
          className={CLASE_CAMPO}
        />
      </label>
      <label className="block space-y-1 sm:col-span-2">
        <span className="block text-sm font-semibold">Tipo de día</span>
        <select
          value={origen}
          onChange={(evento) =>
            cambiarOrigen(evento.target.value as OrigenFestivo)
          }
          className={CLASE_CAMPO}
        >
          {ORIGENES.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.nombre}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Agregar un día sin clase: un día cívico, una jornada institucional, un día del receso. */
function NuevoDia({
  anio,
  alCambiar,
}: {
  anio: number;
  alCambiar: (mensaje: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState('');
  const [nombre, setNombre] = useState('');
  const [origen, setOrigen] = useState<OrigenFestivo>('institucional');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (fecha === '' || nombre.trim() === '') {
      setFallo({ mensaje: 'Escriba la fecha y el nombre del día sin clase.' });
      return;
    }
    setEnviando(true);
    setFallo(null);
    try {
      const { festivo, calendariosRecalculados } = await crearFestivo({
        fecha,
        nombre,
        origen,
      });
      alCambiar(
        `Se agregó «${festivo?.nombre ?? nombre.trim()}» el ${fechaLarga(fecha)}.${textoRecalculo(calendariosRecalculados)}`,
      );
    } catch (error) {
      setFallo(falloDe(error));
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`${CLASE_PRIMARIO} w-full sm:w-auto`}
      >
        Agregar un día sin clase
      </button>
    );
  }
  return (
    <form
      onSubmit={(evento) => void guardar(evento)}
      noValidate
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Agregar un día sin clase</h2>
      <p className="text-sm text-slate-600">
        Para una semana de receso, agregue cada día de lunes a sábado: así el
        calendario no la cuenta como semana del curso.
      </p>
      <CamposDia
        anio={anio}
        fecha={fecha}
        nombre={nombre}
        origen={origen}
        cambiarFecha={setFecha}
        cambiarNombre={setNombre}
        cambiarOrigen={setOrigen}
        prefijo="nuevo"
      />
      {fallo && (
        <AvisoError mensaje={fallo.mensaje} detalles={fallo.detalles} />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={enviando} className={CLASE_PRIMARIO}>
          {enviando ? 'Guardando…' : 'Agregar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setFallo(null);
          }}
          disabled={enviando}
          className={CLASE_SECUNDARIO}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ListaDias({
  lista,
  alCambiar,
}: {
  lista: ListaFestivos;
  alCambiar: (mensaje: string) => void;
}) {
  return (
    <section aria-labelledby="titulo-lista-festivos" className="space-y-3">
      <h2 id="titulo-lista-festivos" className="text-xl font-semibold">
        Días sin clase de {lista.anio}{' '}
        <span className="text-base font-normal text-slate-600">
          ({lista.elementos.length})
        </span>
      </h2>
      {lista.elementos.length === 0 ? (
        <p className="text-sm text-slate-600">
          Todavía no hay días sin clase en {lista.anio}.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.elementos.map((festivo) => (
            <FilaDia
              key={festivo.id}
              festivo={festivo}
              anio={lista.anio}
              alCambiar={alCambiar}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilaDia({
  festivo,
  anio,
  alCambiar,
}: {
  festivo: Festivo;
  anio: number;
  alCambiar: (mensaje: string) => void;
}) {
  const [modo, setModo] = useState<'ver' | 'editar' | 'quitar'>('ver');
  const [fecha, setFecha] = useState(festivo.fecha);
  const [nombre, setNombre] = useState(festivo.nombre);
  const [origen, setOrigen] = useState<OrigenFestivo>(
    (festivo.origen as OrigenFestivo | null) ?? 'institucional',
  );
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);

  function volver() {
    setModo('ver');
    setFecha(festivo.fecha);
    setNombre(festivo.nombre);
    setFallo(null);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (fecha === '' || nombre.trim() === '') {
      setFallo({ mensaje: 'Escriba la fecha y el nombre del día sin clase.' });
      return;
    }
    setEnviando(true);
    setFallo(null);
    try {
      const { calendariosRecalculados } = await editarFestivo(festivo.id, {
        ...(fecha !== festivo.fecha ? { fecha } : {}),
        nombre,
        origen,
      });
      alCambiar(
        `Se guardó «${nombre.trim()}».${textoRecalculo(calendariosRecalculados)}`,
      );
    } catch (error) {
      setFallo(falloDe(error));
    } finally {
      setEnviando(false);
    }
  }

  async function quitar() {
    setEnviando(true);
    setFallo(null);
    try {
      const { calendariosRecalculados } = await eliminarFestivo(
        festivo.id,
        true,
      );
      alCambiar(
        `Se quitó «${festivo.nombre}».${textoRecalculo(calendariosRecalculados)}`,
      );
    } catch (error) {
      setFallo(falloDe(error));
      setEnviando(false);
    }
  }

  const marca =
    festivo.sesiones === 0
      ? 'No marca sesiones'
      : festivo.sesiones === 1
        ? 'Marca 1 sesión'
        : `Marca ${festivo.sesiones} sesiones`;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      {modo === 'editar' ? (
        <form
          onSubmit={(evento) => void guardar(evento)}
          noValidate
          className="space-y-3"
        >
          <CamposDia
            anio={anio}
            fecha={fecha}
            nombre={nombre}
            origen={origen}
            cambiarFecha={setFecha}
            cambiarNombre={setNombre}
            cambiarOrigen={setOrigen}
            prefijo={`festivo-${festivo.id}`}
          />
          {fallo && (
            <AvisoError mensaje={fallo.mensaje} detalles={fallo.detalles} />
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={enviando}
              className={CLASE_PRIMARIO}
            >
              {enviando ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={volver}
              disabled={enviando}
              className={CLASE_SECUNDARIO}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <div className="min-w-0">
            <p className="font-semibold first-letter:uppercase">
              {fechaLarga(festivo.fecha)}
            </p>
            <p className="break-words">{festivo.nombre}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Insignia
              tono={festivo.origen === 'ley' ? 'informativo' : 'neutro'}
            >
              {nombreOrigen(festivo.origen)}
            </Insignia>
            <span className="text-sm text-slate-600">{marca}</span>
          </div>
          {modo === 'quitar' ? (
            <Advertencia titulo={`¿Quitar «${festivo.nombre}»?`}>
              {festivo.sesiones > 0 && (
                <p>
                  {festivo.sesiones === 1
                    ? 'La sesión que marca vuelve a ser de clase'
                    : `Las ${festivo.sesiones} sesiones que marca vuelven a ser de clase`}
                  , salvo las ya registradas, que no cambian.
                </p>
              )}
              {fallo && (
                <AvisoError mensaje={fallo.mensaje} detalles={fallo.detalles} />
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void quitar()}
                  disabled={enviando}
                  className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {enviando ? 'Quitando…' : 'Sí, quitarlo'}
                </button>
                <button
                  type="button"
                  onClick={volver}
                  disabled={enviando}
                  className={CLASE_SECUNDARIO}
                >
                  No quitar
                </button>
              </div>
            </Advertencia>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModo('editar')}
                aria-label={`Editar «${festivo.nombre}»`}
                className="min-h-11 rounded-lg border border-marca px-4 text-sm font-semibold text-marca hover:bg-marca/5"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setModo('quitar')}
                aria-label={`Quitar «${festivo.nombre}»`}
                className="min-h-11 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-50"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
