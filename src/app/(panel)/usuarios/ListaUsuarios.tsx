'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import {
  consultarOpcionesUsuarios,
  consultarUsuarios,
  type EstadoUsuario,
  type FiltroUsuarios,
  nombreCompleto,
  type OpcionesUsuarios,
  PERMISO_ADMINISTRAR_USUARIOS,
  PERMISO_CONSULTAR_USUARIOS,
  textoRol,
  type Usuario,
} from '@/api/usuarios';
import { usePermisos } from '@/sesion/permisos';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';

const TAMANO_PAGINA = 20;

/**
 * Listado de usuarios con filtros por programa, rol y estado (RF-02, p2; HU-02-04). Lo
 * consultan el Administrador, el Departamento y la Dirección; solo el Administrador ve el
 * botón de crear. El documento de identidad no aparece aquí: está en el detalle, y solo para
 * quien administra.
 */
export function ListaUsuarios() {
  const tiene = usePermisos();
  const puedeConsultar = tiene(PERMISO_CONSULTAR_USUARIOS);
  const puedeAdministrar = tiene(PERMISO_ADMINISTRAR_USUARIOS);
  const [filtro, setFiltro] = useState<FiltroUsuarios>({});
  const [pagina, setPagina] = useState(1);
  const usuarios = useConsulta(
    puedeConsultar ? `usuarios-${JSON.stringify(filtro)}-${pagina}` : null,
    (senal) => consultarUsuarios(filtro, pagina, TAMANO_PAGINA, senal),
  );
  const opciones = useConsulta(
    puedeConsultar ? 'usuarios-opciones' : null,
    consultarOpcionesUsuarios,
  );
  const totalPaginas =
    usuarios.estado === 'lista'
      ? Math.max(1, Math.ceil(usuarios.datos.total / TAMANO_PAGINA))
      : 1;
  const hayFiltros = Object.values(filtro).some((valor) => valor !== undefined);
  const cambiarFiltro = (cambio: FiltroUsuarios) => {
    setFiltro((previo) => ({ ...previo, ...cambio }));
    setPagina(1);
  };

  return (
    <section aria-labelledby="titulo-usuarios" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="titulo-usuarios" className="text-2xl font-bold sm:text-3xl">
            Usuarios
          </h1>
          {puedeAdministrar && (
            <Link
              href="/usuarios/nuevo"
              className="inline-flex min-h-11 items-center rounded-lg bg-marca px-4 py-2 font-semibold text-white hover:bg-marca-oscuro"
            >
              Nuevo usuario
            </Link>
          )}
        </div>
        <p className="text-slate-700">
          {puedeAdministrar
            ? 'Cree usuarios, actualice sus datos y sus roles, e inactive a quienes ya no deben entrar.'
            : 'Personas con acceso al sistema en su programa, con sus roles y su estado.'}
        </p>
      </div>

      {!puedeConsultar && (
        <AvisoError mensaje="No tiene permiso para consultar los usuarios." />
      )}

      {puedeConsultar && (
        <>
          {opciones.estado === 'lista' && (
            <Filtros
              opciones={opciones.datos}
              filtro={filtro}
              alCambiar={cambiarFiltro}
            />
          )}

          {usuarios.estado === 'cargando' && <Cargando />}
          {usuarios.estado === 'fallida' && (
            <AvisoError
              mensaje={usuarios.mensaje}
              reintentar={
                usuarios.reintentable ? usuarios.reintentar : undefined
              }
            />
          )}
          {usuarios.estado === 'lista' && usuarios.datos.total === 0 && (
            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-600">
              <p>
                {hayFiltros
                  ? 'No hay usuarios con estos filtros.'
                  : 'Todavía no hay usuarios.'}
              </p>
              {hayFiltros && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltro({});
                    setPagina(1);
                  }}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Quitar los filtros
                </button>
              )}
            </div>
          )}
          {usuarios.estado === 'lista' &&
            usuarios.datos.elementos.length > 0 && (
              <>
                <p className="text-sm text-slate-700">
                  {usuarios.datos.total === 1
                    ? '1 usuario'
                    : `${usuarios.datos.total} usuarios`}
                </p>

                {/* Teléfono: una tarjeta por usuario. */}
                <ul className="space-y-3 md:hidden">
                  {usuarios.datos.elementos.map((usuario) => (
                    <li key={usuario.id}>
                      <Tarjeta usuario={usuario} />
                    </li>
                  ))}
                </ul>

                {/* Pantalla ancha: una tabla. */}
                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                  <table className="min-w-full text-sm">
                    <caption className="sr-only">Usuarios del sistema</caption>
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Nombre
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Correo
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Roles
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usuarios.datos.elementos.map((usuario) => (
                        <tr key={usuario.id} className="align-top">
                          <th
                            scope="row"
                            className="px-3 py-2 text-left font-normal"
                          >
                            <Link
                              href={`/usuarios/${usuario.id}`}
                              className="font-semibold text-marca hover:underline"
                            >
                              {nombreCompleto(usuario)}
                            </Link>
                            {usuario.programa && (
                              <span className="block text-xs text-slate-600">
                                {usuario.programa}
                              </span>
                            )}
                          </th>
                          <td className="px-3 py-2 break-all">
                            {usuario.correo}
                          </td>
                          <td className="px-3 py-2">
                            <Roles usuario={usuario} />
                          </td>
                          <td className="px-3 py-2">
                            <Estado activo={usuario.activo} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && (
                  <nav
                    aria-label="Páginas del listado de usuarios"
                    className="flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      disabled={pagina <= 1}
                      onClick={() => setPagina(pagina - 1)}
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
                      onClick={() => setPagina(pagina + 1)}
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

export function Estado({ activo }: { activo: boolean }) {
  return activo ? (
    <Insignia tono="marca">Activo</Insignia>
  ) : (
    <Insignia tono="peligro">Inactivo</Insignia>
  );
}

function Roles({ usuario }: { usuario: Usuario }) {
  if (usuario.roles.length === 0) {
    return <span className="text-slate-600">Sin roles vigentes</span>;
  }
  return (
    <ul className="space-y-0.5">
      {usuario.roles.map((rol) => (
        <li key={rol.id}>{textoRol(rol)}</li>
      ))}
    </ul>
  );
}

function Tarjeta({ usuario }: { usuario: Usuario }) {
  return (
    <Link
      href={`/usuarios/${usuario.id}`}
      className="block space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-slate-900">
          {nombreCompleto(usuario)}
        </p>
        <Estado activo={usuario.activo} />
      </div>
      <p className="text-sm break-all text-slate-700">{usuario.correo}</p>
      <div className="text-sm text-slate-700">
        <Roles usuario={usuario} />
      </div>
      <p className="text-sm font-semibold text-marca">Ver el usuario →</p>
    </Link>
  );
}

/** Los selectores se aplican al cambiar; el texto, con el botón «Buscar». */
function Filtros({
  opciones,
  filtro,
  alCambiar,
}: {
  opciones: OpcionesUsuarios;
  filtro: FiltroUsuarios;
  alCambiar: (cambio: FiltroUsuarios) => void;
}) {
  const ids = {
    programa: useId(),
    rol: useId(),
    estado: useId(),
    buscar: useId(),
  };
  const [texto, setTexto] = useState(filtro.buscar ?? '');
  const numero = (valor: string) => (valor ? Number(valor) : undefined);
  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    alCambiar({ buscar: texto.trim() || undefined });
  };
  const clase =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  return (
    <form
      onSubmit={buscar}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-6 lg:grid-cols-4"
    >
      {opciones.programas.length > 1 && (
        <div className="space-y-1">
          <label htmlFor={ids.programa} className="block font-medium">
            Programa
          </label>
          <select
            id={ids.programa}
            value={filtro.idPrograma ?? ''}
            onChange={(evento) =>
              alCambiar({ idPrograma: numero(evento.target.value) })
            }
            className={clase}
          >
            <option value="">Todos</option>
            {opciones.programas.map((programa) => (
              <option key={programa.id} value={programa.id}>
                {programa.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor={ids.rol} className="block font-medium">
          Rol
        </label>
        <select
          id={ids.rol}
          value={filtro.idRol ?? ''}
          onChange={(evento) =>
            alCambiar({ idRol: numero(evento.target.value) })
          }
          className={clase}
        >
          <option value="">Todos</option>
          {opciones.roles.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor={ids.estado} className="block font-medium">
          Estado
        </label>
        <select
          id={ids.estado}
          value={filtro.estado ?? ''}
          onChange={(evento) =>
            alCambiar({
              estado: (evento.target.value || undefined) as
                EstadoUsuario | undefined,
            })
          }
          className={clase}
        >
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor={ids.buscar} className="block font-medium">
          Nombre o correo
        </label>
        <div className="flex gap-2">
          <input
            id={ids.buscar}
            type="search"
            value={texto}
            maxLength={100}
            autoComplete="off"
            onChange={(evento) => setTexto(evento.target.value)}
            className={clase}
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 hover:bg-slate-50"
          >
            Buscar
          </button>
        </div>
      </div>
    </form>
  );
}
