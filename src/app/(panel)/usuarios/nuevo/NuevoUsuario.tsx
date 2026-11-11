'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  consultarOpcionesUsuarios,
  crearUsuario,
  nombreCompleto,
  PERMISO_ADMINISTRAR_USUARIOS,
  type UsuarioCreado,
} from '@/api/usuarios';
import { usePermisos } from '@/sesion/permisos';
import {
  AvisoError,
  Cargando,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { ContrasenaTemporal } from '../_componentes/ContrasenaTemporal';
import { FormularioUsuario } from '../_componentes/FormularioUsuario';

/**
 * Crear un usuario con uno o varios roles (HU-02-01). Al guardar, la pantalla muestra una
 * sola vez la contraseña temporal que generó el backend.
 */
export function NuevoUsuario() {
  const tiene = usePermisos();
  const puede = tiene(PERMISO_ADMINISTRAR_USUARIOS);
  const opciones = useConsulta(
    puede ? 'usuarios-opciones' : null,
    consultarOpcionesUsuarios,
  );
  const [creado, setCreado] = useState<UsuarioCreado | null>(null);

  return (
    <section aria-labelledby="titulo-nuevo-usuario" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/usuarios"
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Usuarios
        </Link>
        <h1
          id="titulo-nuevo-usuario"
          className="text-2xl font-bold sm:text-3xl"
        >
          {creado ? 'Usuario creado' : 'Nuevo usuario'}
        </h1>
      </div>

      {!puede && <AvisoError mensaje="No tiene permiso para crear usuarios." />}
      {opciones.estado === 'cargando' && <Cargando />}
      {opciones.estado === 'fallida' && (
        <AvisoError
          mensaje={opciones.mensaje}
          reintentar={opciones.reintentable ? opciones.reintentar : undefined}
        />
      )}

      {creado && (
        <>
          <p className="text-slate-700">
            <strong>{nombreCompleto(creado.usuario)}</strong> quedó activo y ya
            puede iniciar sesión con el correo{' '}
            <span className="break-all">{creado.usuario.correo}</span> y esta
            contraseña.
          </p>
          <ContrasenaTemporal
            contrasena={creado.contrasenaTemporal}
            nombre={nombreCompleto(creado.usuario)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/usuarios/${creado.usuario.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-marca px-4 py-2 font-semibold text-white hover:bg-marca-oscuro"
            >
              Ver el usuario
            </Link>
            <button
              type="button"
              onClick={() => setCreado(null)}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50"
            >
              Crear otro usuario
            </button>
          </div>
        </>
      )}

      {!creado && opciones.estado === 'lista' && (
        <FormularioUsuario
          modo="crear"
          opciones={opciones.datos}
          rutaCancelar="/usuarios"
          guardar={async (datos) => setCreado(await crearUsuario(datos))}
        />
      )}
    </section>
  );
}
