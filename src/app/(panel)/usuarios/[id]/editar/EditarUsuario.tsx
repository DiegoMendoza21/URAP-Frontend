'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  consultarOpcionesUsuarios,
  consultarUsuario,
  editarUsuario,
  nombreCompleto,
  PERMISO_ADMINISTRAR_USUARIOS,
} from '@/api/usuarios';
import { usePermisos } from '@/sesion/permisos';
import {
  AvisoError,
  Cargando,
} from '../../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../../proyectos-docentes/_componentes/useConsulta';
import { FormularioUsuario } from '../../_componentes/FormularioUsuario';

/**
 * Editar los datos de un usuario (HU-02-02). Carga lo que hay, envía solo lo que cambió y
 * vuelve a la página del usuario. Los roles se manejan allá.
 */
export function EditarUsuario() {
  const tiene = usePermisos();
  const router = useRouter();
  const { id: idTexto } = useParams<{ id: string }>();
  const id = /^\d+$/.test(idTexto) ? Number(idTexto) : null;
  const puede = tiene(PERMISO_ADMINISTRAR_USUARIOS);
  const usuario = useConsulta(
    puede && id !== null ? `usuario-editar-${id}` : null,
    (senal) => consultarUsuario(id!, senal),
  );
  const opciones = useConsulta(
    puede ? 'usuarios-opciones' : null,
    consultarOpcionesUsuarios,
  );
  const rutaUsuario = id === null ? '/usuarios' : `/usuarios/${id}`;

  return (
    <section aria-labelledby="titulo-editar-usuario" className="space-y-6">
      <div className="space-y-1">
        <Link
          href={rutaUsuario}
          className="text-sm font-medium text-marca hover:underline"
        >
          ←{' '}
          {usuario.estado === 'lista'
            ? nombreCompleto(usuario.datos)
            : 'Usuario'}
        </Link>
        <h1
          id="titulo-editar-usuario"
          className="text-2xl font-bold sm:text-3xl"
        >
          Editar los datos
        </h1>
      </div>

      {!puede && (
        <AvisoError mensaje="No tiene permiso para editar usuarios." />
      )}
      {puede && id === null && <AvisoError mensaje="El usuario no existe." />}
      {(usuario.estado === 'cargando' || opciones.estado === 'cargando') && (
        <Cargando />
      )}
      {usuario.estado === 'fallida' && (
        <AvisoError
          mensaje={usuario.mensaje}
          reintentar={usuario.reintentable ? usuario.reintentar : undefined}
        />
      )}
      {opciones.estado === 'fallida' && (
        <AvisoError
          mensaje={opciones.mensaje}
          reintentar={opciones.reintentable ? opciones.reintentar : undefined}
        />
      )}

      {usuario.estado === 'lista' && opciones.estado === 'lista' && (
        <FormularioUsuario
          modo="editar"
          usuario={usuario.datos}
          opciones={opciones.datos}
          rutaCancelar={rutaUsuario}
          guardar={async (cambios) => {
            if (Object.keys(cambios).length > 0) {
              await editarUsuario(usuario.datos.id, cambios);
            }
            router.push(rutaUsuario);
          }}
        />
      )}
    </section>
  );
}
