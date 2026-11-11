'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';
import {
  consultarAuditoria,
  type EventoAuditoria,
  type FiltroAuditoria,
  type RegistroAuditoria,
} from '@/api/auditoria';
import { usePermisos } from '@/sesion/permisos';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';
import { guardarConsulta } from './consultaGuardada';
import {
  cuando,
  ENTIDADES,
  EVENTOS,
  nombreCampo,
  nombreEntidad,
  nombreEvento,
  opcionesDeEvento,
  PERMISO_AUDITORIA,
  queHizo,
  quien,
  sobreQue,
  tonoEvento,
} from './textos';

const TAMANO_PAGINA = 20;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Los filtros viajan en la dirección: así el botón «atrás» del detalle los conserva. */
function leerFiltro(parametros: URLSearchParams): FiltroAuditoria {
  const texto = (clave: string) => parametros.get(clave)?.trim() || undefined;
  const fecha = (clave: string) => {
    const valor = texto(clave);
    return valor && PATRON_FECHA.test(valor) ? valor : undefined;
  };
  const evento = texto('evento');
  const idRegistro = texto('idRegistro');
  return {
    desde: fecha('desde'),
    hasta: fecha('hasta'),
    usuario: texto('usuario'),
    evento:
      evento && evento in EVENTOS ? (evento as EventoAuditoria) : undefined,
    entidad: texto('entidad'),
    idRegistro:
      idRegistro && /^\d+$/.test(idRegistro) ? Number(idRegistro) : undefined,
  };
}

function aDireccion(filtro: FiltroAuditoria, pagina: number): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== undefined && valor !== '') {
      parametros.set(clave, String(valor));
    }
  }
  if (pagina > 1) {
    parametros.set('pagina', String(pagina));
  }
  return parametros.toString();
}

/**
 * Consulta de la auditoría con filtros (RF-29, p4; HU-14-02). Es la consulta completa, la del
 * Administrador: el backend responde 403 a quien no tiene `auditoria.administrar`, y esta
 * pantalla ni siquiera la pide. Solo se lee: los registros no se modifican ni se eliminan.
 */
export function ConsultaAuditoria() {
  const tiene = usePermisos();
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const direccion = parametros.toString();
  const filtro = leerFiltro(parametros);
  const paginaPedida = Number(parametros.get('pagina'));
  const pagina =
    Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  const puede = tiene(PERMISO_AUDITORIA);

  const registros = useConsulta(
    puede ? `auditoria-${direccion}` : null,
    (senal) => consultarAuditoria(filtro, pagina, TAMANO_PAGINA, senal),
  );
  useEffect(() => guardarConsulta(direccion), [direccion]);

  const ir = (nuevo: FiltroAuditoria, nuevaPagina = 1) => {
    const consulta = aDireccion(nuevo, nuevaPagina);
    router.push(consulta ? `${ruta}?${consulta}` : ruta);
  };
  const totalPaginas =
    registros.estado === 'lista'
      ? Math.max(1, Math.ceil(registros.datos.total / TAMANO_PAGINA))
      : 1;
  const hayFiltros = Object.values(filtro).some((valor) => valor !== undefined);
  const esHistorial =
    filtro.entidad !== undefined && filtro.idRegistro !== undefined;

  return (
    <section aria-labelledby="titulo-auditoria" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <h1 id="titulo-auditoria" className="text-2xl font-bold sm:text-3xl">
          Auditoría
        </h1>
        <p className="text-slate-700">
          Quién hizo qué, cuándo y sobre qué: creaciones, modificaciones,
          eliminaciones, aprobaciones y consultas sensibles. Los registros no se
          pueden modificar ni eliminar.
        </p>
      </div>

      {!puede && (
        <AvisoError mensaje="No tiene permiso para consultar la auditoría." />
      )}

      {puede && (
        <>
          {esHistorial && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-marca/30 bg-marca/5 px-4 py-3">
              <p className="font-medium text-slate-900">
                Historial de {sobreQue(filtro.entidad!, filtro.idRegistro!)}
              </p>
              <Link
                href={ruta}
                className="text-sm font-semibold text-marca hover:underline"
              >
                Ver toda la auditoría
              </Link>
            </div>
          )}

          {/* La clave reinicia el formulario cuando la dirección cambia (atrás, quitar filtros). */}
          <Filtros key={direccion} filtro={filtro} alAplicar={ir} />

          {registros.estado === 'cargando' && <Cargando />}
          {registros.estado === 'fallida' && (
            <AvisoError
              mensaje={registros.mensaje}
              reintentar={
                registros.reintentable ? registros.reintentar : undefined
              }
            />
          )}
          {registros.estado === 'lista' && registros.datos.total === 0 && (
            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-600">
              <p>
                {hayFiltros
                  ? 'No hay registros de auditoría con estos filtros.'
                  : 'Todavía no hay registros de auditoría. Aparecerán aquí a medida que las personas usen el sistema.'}
              </p>
              {hayFiltros && (
                <Link
                  href={ruta}
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Quitar los filtros
                </Link>
              )}
            </div>
          )}
          {registros.estado === 'lista' &&
            registros.datos.total > 0 &&
            registros.datos.elementos.length === 0 && (
              <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-600">
                <p>Esta página ya no tiene registros.</p>
                <button
                  type="button"
                  onClick={() => ir(filtro)}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Volver a la primera página
                </button>
              </div>
            )}
          {registros.estado === 'lista' &&
            registros.datos.elementos.length > 0 && (
              <>
                <p className="text-sm text-slate-700">
                  {registros.datos.total === 1
                    ? '1 registro'
                    : `${registros.datos.total} registros`}
                  , del más reciente al más antiguo.
                </p>

                {/* Teléfono: una tarjeta por registro. */}
                <ul className="space-y-3 md:hidden">
                  {registros.datos.elementos.map((registro) => (
                    <li key={registro.id}>
                      <Tarjeta registro={registro} />
                    </li>
                  ))}
                </ul>

                {/* Pantalla ancha: una tabla para recorrer muchos registros. */}
                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                  <table className="min-w-full text-sm">
                    <caption className="sr-only">
                      Registros de auditoría, del más reciente al más antiguo
                    </caption>
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Cuándo
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Quién
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Qué hizo
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Sobre qué
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          <span className="sr-only">Detalle</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registros.datos.elementos.map((registro) => (
                        <tr key={registro.id} className="align-top">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {cuando(registro.fecha)}
                          </td>
                          <td className="px-3 py-2">{quien(registro)}</td>
                          <td className="px-3 py-2">
                            <Insignia tono={tonoEvento(registro.evento)}>
                              {nombreEvento(registro.evento)}
                            </Insignia>
                          </td>
                          <td className="px-3 py-2">
                            {sobreQue(registro.entidad, registro.idRegistro)}
                            <Campos campos={registro.campos} />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <Link
                              href={`/auditoria/${registro.id}`}
                              className="font-semibold text-marca hover:underline"
                            >
                              Ver el detalle
                              <span className="sr-only">
                                {' '}
                                del registro n.º {registro.id}
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && (
                  <nav
                    aria-label="Páginas de la auditoría"
                    className="flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      disabled={pagina <= 1}
                      onClick={() => ir(filtro, pagina - 1)}
                      className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-slate-700">
                      Página {pagina} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      disabled={pagina >= totalPaginas}
                      onClick={() => ir(filtro, pagina + 1)}
                      className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </nav>
                )}
              </>
            )}
        </>
      )}
    </section>
  );
}

/** Los campos que guarda el registro, con su nombre del dominio. */
function Campos({ campos }: { campos: string[] }) {
  if (campos.length === 0) {
    return null;
  }
  return (
    <span className="block text-xs text-slate-600">
      {campos.length === 1 ? 'Campo: ' : 'Campos: '}
      {campos.map(nombreCampo).join(', ')}
    </span>
  );
}

/** Un registro en el teléfono: cuándo, quién, qué hizo y sobre qué, en una frase. */
function Tarjeta({ registro }: { registro: RegistroAuditoria }) {
  return (
    <Link
      href={`/auditoria/${registro.id}`}
      className="block space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Insignia tono={tonoEvento(registro.evento)}>
          {nombreEvento(registro.evento)}
        </Insignia>
        <span className="text-sm text-slate-600">{cuando(registro.fecha)}</span>
      </div>
      <p className="text-slate-900">
        <span className="font-semibold">{quien(registro)}</span>{' '}
        {queHizo(registro)}
      </p>
      <Campos campos={registro.campos} />
      <p className="text-sm font-semibold text-marca">Ver el detalle →</p>
    </Link>
  );
}

/**
 * Filtros por fecha, usuario, acción y entidad (RF-29, p4). En el teléfono van plegados para
 * que la lista quede a la vista; se aplican con el botón, no con cada tecla.
 */
function Filtros({
  filtro,
  alAplicar,
}: {
  filtro: FiltroAuditoria;
  alAplicar: (filtro: FiltroAuditoria) => void;
}) {
  const ids = {
    panel: useId(),
    desde: useId(),
    hasta: useId(),
    usuario: useId(),
    accion: useId(),
    entidad: useId(),
    error: useId(),
  };
  const [abiertos, setAbiertos] = useState(false);
  const [desde, setDesde] = useState(filtro.desde ?? '');
  const [hasta, setHasta] = useState(filtro.hasta ?? '');
  const [usuario, setUsuario] = useState(filtro.usuario ?? '');
  // La acción del filtro es el evento: las mismas palabras que llevan las etiquetas.
  const [accion, setAccion] = useState<string>(filtro.evento ?? '');
  const [entidad, setEntidad] = useState(filtro.entidad ?? '');
  const [error, setError] = useState<string | null>(null);

  const activos = [
    filtro.desde ?? filtro.hasta,
    filtro.usuario,
    filtro.evento,
    filtro.entidad,
  ].filter(Boolean).length;
  // Una entidad que llegó en la dirección y no está en la lista también se puede ver elegida.
  const entidades = Object.keys(ENTIDADES);
  if (entidad && !entidades.includes(entidad)) {
    entidades.push(entidad);
  }
  entidades.sort((a, b) =>
    nombreEntidad(a).localeCompare(nombreEntidad(b), 'es'),
  );

  const aplicar = (evento: FormEvent) => {
    evento.preventDefault();
    if (desde && hasta && desde > hasta) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    setError(null);
    alAplicar({
      desde: desde || undefined,
      hasta: hasta || undefined,
      usuario: usuario.trim() || undefined,
      evento: (accion || undefined) as EventoAuditoria | undefined,
      entidad: entidad || undefined,
      // El historial de un registro solo tiene sentido con su misma entidad.
      idRegistro: entidad === filtro.entidad ? filtro.idRegistro : undefined,
    });
  };

  const clase =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={abiertos}
        aria-controls={ids.panel}
        onClick={() => setAbiertos(!abiertos)}
        className="flex min-h-12 w-full items-center justify-between gap-2 px-4 font-semibold text-slate-900 md:hidden"
      >
        <span>
          Filtros
          {activos > 0 && (
            <span className="ml-2 font-normal text-slate-600">
              ({activos === 1 ? '1 aplicado' : `${activos} aplicados`})
            </span>
          )}
        </span>
        <span aria-hidden="true">{abiertos ? '▲' : '▼'}</span>
      </button>
      <form
        id={ids.panel}
        onSubmit={aplicar}
        noValidate
        className={`${abiertos ? 'grid' : 'hidden'} gap-3 border-t border-slate-200 p-4 md:grid md:grid-cols-2 md:border-t-0 md:p-6 lg:grid-cols-3`}
      >
        <div className="space-y-1">
          <label htmlFor={ids.desde} className="block font-medium">
            Desde
          </label>
          <input
            id={ids.desde}
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(evento) => setDesde(evento.target.value)}
            aria-describedby={error ? ids.error : undefined}
            className={clase}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.hasta} className="block font-medium">
            Hasta
          </label>
          <input
            id={ids.hasta}
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(evento) => setHasta(evento.target.value)}
            aria-describedby={error ? ids.error : undefined}
            className={clase}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.usuario} className="block font-medium">
            Usuario
          </label>
          <input
            id={ids.usuario}
            type="search"
            value={usuario}
            maxLength={100}
            placeholder="Nombre o correo"
            autoComplete="off"
            onChange={(evento) => setUsuario(evento.target.value)}
            className={clase}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.accion} className="block font-medium">
            Acción
          </label>
          <select
            id={ids.accion}
            value={accion}
            onChange={(evento) => setAccion(evento.target.value)}
            className={clase}
          >
            <option value="">Todas</option>
            {opcionesDeEvento().map(({ codigo, nombre }) => (
              <option key={codigo} value={codigo}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.entidad} className="block font-medium">
            Sobre qué
          </label>
          <select
            id={ids.entidad}
            value={entidad}
            onChange={(evento) => setEntidad(evento.target.value)}
            className={clase}
          >
            <option value="">Todo</option>
            {entidades.map((codigo) => (
              <option key={codigo} value={codigo}>
                {nombreEntidad(codigo)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-lg bg-marca px-4 py-2 font-semibold text-white hover:bg-marca/90"
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={() => alAplicar({})}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50"
          >
            Limpiar
          </button>
        </div>
        {error && (
          <p
            id={ids.error}
            role="alert"
            className="text-sm text-red-800 md:col-span-2 lg:col-span-3"
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
