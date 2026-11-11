'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  cambiarEstadoUsuario,
  consultarUsuario,
  type DetalleUsuario as Detalle,
  generarContrasenaTemporal,
  nombreCompleto,
  PERMISO_ADMINISTRAR_USUARIOS,
  PERMISO_CONSULTAR_USUARIOS,
} from '@/api/usuarios';
import { useSesion } from '@/sesion/ProveedorSesion';
import { usePermisos } from '@/sesion/permisos';
import {
  AvisoError,
  Cargando,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { Estado } from '../ListaUsuarios';
import { Confirmacion } from '../_componentes/Confirmacion';
import { ContrasenaTemporal } from '../_componentes/ContrasenaTemporal';
import { momento } from '../_componentes/momento';
import { RolesUsuario } from './RolesUsuario';

type Accion = 'estado' | 'contrasena';

/**
 * Página de un usuario (RF-02): sus datos, su estado y sus roles. Quien administra puede
 * editarlo (HU-02-02), inactivarlo o reactivarlo (HU-02-03), generarle una contraseña
 * temporal y asignarle o revocarle roles, con su historial (HU-02-07). Quien solo consulta ve
 * los datos y los roles vigentes, sin el documento y sin acciones.
 */
export function DetalleUsuario() {
  const tiene = usePermisos();
  const { sesion } = useSesion();
  const { id: idTexto } = useParams<{ id: string }>();
  const id = /^\d+$/.test(idTexto) ? Number(idTexto) : null;
  const puedeConsultar = tiene(PERMISO_CONSULTAR_USUARIOS);
  const puedeAdministrar = tiene(PERMISO_ADMINISTRAR_USUARIOS);
  const [version, setVersion] = useState(0);
  const consulta = useConsulta(
    puedeConsultar && id !== null ? `usuario-${id}-${version}` : null,
    (senal) => consultarUsuario(id!, senal),
  );
  /** Lo que devolvió la última acción: evita mostrar «Cargando…» mientras se vuelve a consultar. */
  const [actualizado, setActualizado] = useState<Detalle | null>(null);
  const usuario =
    consulta.estado === 'lista' ? consulta.datos : (actualizado ?? null);
  const esPropio =
    sesion.estado === 'autenticado' && sesion.usuario.id === usuario?.id;

  const [porConfirmar, setPorConfirmar] = useState<Accion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [contrasena, setContrasena] = useState<string | null>(null);

  async function ejecutar(accion: Accion) {
    if (!usuario) {
      return;
    }
    setError(null);
    setAviso(null);
    setOcupado(true);
    try {
      if (accion === 'estado') {
        const nuevo = await cambiarEstadoUsuario(usuario.id, !usuario.activo);
        setActualizado(nuevo);
        setVersion((valor) => valor + 1);
        setAviso(
          nuevo.activo
            ? 'El usuario quedó activo: ya puede iniciar sesión.'
            : 'El usuario quedó inactivo: no puede iniciar sesión y sus sesiones abiertas se cerraron.',
        );
      } else {
        const respuesta = await generarContrasenaTemporal(usuario.id);
        setContrasena(respuesta.contrasenaTemporal);
      }
    } catch (fallo) {
      setError(mensajeParaUsuario(fallo));
    } finally {
      setOcupado(false);
      setPorConfirmar(null);
    }
  }

  return (
    <section aria-labelledby="titulo-usuario" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/usuarios"
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Usuarios
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="titulo-usuario" className="text-2xl font-bold sm:text-3xl">
            {usuario ? nombreCompleto(usuario) : 'Usuario'}
          </h1>
          {usuario && <Estado activo={usuario.activo} />}
        </div>
      </div>

      {!puedeConsultar && (
        <AvisoError mensaje="No tiene permiso para consultar los usuarios." />
      )}
      {puedeConsultar && id === null && (
        <AvisoError mensaje="El usuario no existe." />
      )}
      {consulta.estado === 'cargando' && !usuario && <Cargando />}
      {consulta.estado === 'fallida' && (
        <AvisoError
          mensaje={consulta.mensaje}
          reintentar={consulta.reintentable ? consulta.reintentar : undefined}
        />
      )}

      {usuario && (
        <>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Dato termino="Correo institucional">
                <span className="break-all">{usuario.correo}</span>
              </Dato>
              {puedeAdministrar && (
                <Dato termino="Documento de identidad">
                  {usuario.identificacion ?? 'Sin registrar'}
                </Dato>
              )}
              <Dato termino="Programa">
                {usuario.programa ?? 'Sin programa'}
              </Dato>
              <Dato termino="Último ingreso">
                {momento(usuario.ultimoAcceso) ?? 'Todavía no ha ingresado'}
              </Dato>
              {usuario.bloqueadoHasta && (
                <Dato termino="Bloqueado por intentos fallidos">
                  Hasta el {momento(usuario.bloqueadoHasta)}
                </Dato>
              )}
            </dl>
            {puedeAdministrar && (
              <Link
                href={`/usuarios/${usuario.id}/editar`}
                className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50"
              >
                Editar los datos
              </Link>
            )}
          </div>

          <RolesUsuario
            usuario={usuario}
            puedeAdministrar={puedeAdministrar}
            alCambiar={(nuevo) => {
              setActualizado(nuevo);
              setVersion((valor) => valor + 1);
            }}
          />

          {puedeAdministrar && (
            <section
              aria-labelledby="titulo-acceso"
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            >
              <h2 id="titulo-acceso" className="text-lg font-semibold">
                Acceso
              </h2>
              {error && <AvisoError mensaje={error} />}
              {aviso && (
                <p
                  role="status"
                  className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900"
                >
                  {aviso}
                </p>
              )}
              {contrasena && (
                <ContrasenaTemporal
                  contrasena={contrasena}
                  nombre={nombreCompleto(usuario)}
                />
              )}

              {porConfirmar === null && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setPorConfirmar('contrasena')}
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Generar una contraseña nueva
                  </button>
                  {!esPropio && (
                    <button
                      type="button"
                      onClick={() => setPorConfirmar('estado')}
                      className={`min-h-11 rounded-lg border bg-white px-4 py-2 font-semibold ${
                        usuario.activo
                          ? 'border-red-300 text-red-800 hover:bg-red-50'
                          : 'border-slate-300 text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {usuario.activo
                        ? 'Inactivar el usuario'
                        : 'Reactivar el usuario'}
                    </button>
                  )}
                </div>
              )}
              {esPropio && porConfirmar === null && (
                <p className="text-sm text-slate-600">
                  Este es su propio usuario: no puede inactivarse a sí mismo.
                </p>
              )}

              {porConfirmar === 'estado' && (
                <Confirmacion
                  textoConfirmar={
                    usuario.activo ? 'Sí, inactivar' : 'Sí, reactivar'
                  }
                  peligro={usuario.activo}
                  ocupado={ocupado}
                  alConfirmar={() => void ejecutar('estado')}
                  alCancelar={() => setPorConfirmar(null)}
                >
                  {usuario.activo ? (
                    <p>
                      ¿Inactivar a <strong>{nombreCompleto(usuario)}</strong>?
                      No podrá iniciar sesión y sus sesiones abiertas se
                      cerrarán. Lo que registró se conserva, y puede reactivarlo
                      después.
                    </p>
                  ) : (
                    <p>
                      ¿Reactivar a <strong>{nombreCompleto(usuario)}</strong>?
                      Podrá iniciar sesión de nuevo con su contraseña y sus
                      roles vigentes.
                    </p>
                  )}
                </Confirmacion>
              )}
              {porConfirmar === 'contrasena' && (
                <Confirmacion
                  textoConfirmar="Sí, generar la contraseña"
                  ocupado={ocupado}
                  alConfirmar={() => void ejecutar('contrasena')}
                  alCancelar={() => setPorConfirmar(null)}
                >
                  <p>
                    ¿Generar una contraseña nueva para{' '}
                    <strong>{nombreCompleto(usuario)}</strong>? La contraseña
                    actual dejará de servir
                    {esPropio
                      ? '.'
                      : ' y sus sesiones abiertas se cerrarán.'}{' '}
                    La nueva se muestra una sola vez.
                  </p>
                </Confirmacion>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-slate-600">{termino}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}
