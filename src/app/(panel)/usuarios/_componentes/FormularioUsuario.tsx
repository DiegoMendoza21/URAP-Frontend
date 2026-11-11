'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  type CambiosUsuario,
  type DatosNuevoUsuario,
  type DetalleUsuario,
  type OpcionesUsuarios,
} from '@/api/usuarios';
import { AvisoError } from '../../proyectos-docentes/_componentes/Estados';

/** Un rol del formulario de creación. `idPrograma` vacío: todos los programas. */
interface FilaRol {
  clave: number;
  idRol: string;
  idPrograma: string;
}

type Envio =
  | { modo: 'crear'; guardar: (datos: DatosNuevoUsuario) => Promise<void> }
  | {
      modo: 'editar';
      usuario: DetalleUsuario;
      guardar: (cambios: CambiosUsuario) => Promise<void>;
    };

/**
 * Datos de un usuario (RF-02, p4): nombres, apellidos, documento, correo institucional y
 * programa. Al crear, además, uno o varios roles con su programa (HU-02-01). Al editar
 * (HU-02-02) solo se envían los campos que cambiaron; los roles se manejan en la página del
 * usuario. El backend vuelve a validar todo.
 */
export function FormularioUsuario({
  opciones,
  rutaCancelar,
  ...envio
}: { opciones: OpcionesUsuarios; rutaCancelar: string } & Envio) {
  const inicial = envio.modo === 'editar' ? envio.usuario : null;
  const ids = {
    nombres: useId(),
    apellidos: useId(),
    documento: useId(),
    correo: useId(),
    programa: useId(),
    roles: useId(),
  };
  const [nombres, setNombres] = useState(inicial?.nombres ?? '');
  const [apellidos, setApellidos] = useState(inicial?.apellidos ?? '');
  const [documento, setDocumento] = useState(inicial?.identificacion ?? '');
  const [correo, setCorreo] = useState(inicial?.correo ?? '');
  const [idPrograma, setIdPrograma] = useState(
    String(
      inicial?.idPrograma ??
        (opciones.programas.length === 1 ? opciones.programas[0].id : ''),
    ),
  );
  // El rol empieza sobre el programa de la persona: «Todos los programas» se elige a propósito.
  const [roles, setRoles] = useState<FilaRol[]>([
    { clave: 0, idRol: '', idPrograma },
  ]);
  const [siguienteClave, setSiguienteClave] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<{
    mensaje: string;
    detalles?: string[];
  } | null>(null);

  const cambiarRol = (clave: number, cambio: Partial<FilaRol>) =>
    setRoles((filas) =>
      filas.map((fila) =>
        fila.clave === clave ? { ...fila, ...cambio } : fila,
      ),
    );

  function faltantes(): string[] {
    const lista: string[] = [];
    if (nombres.trim().length < 2) lista.push('Escriba los nombres.');
    if (apellidos.trim().length < 2) lista.push('Escriba los apellidos.');
    if (!/^[A-Za-z0-9-]{4,20}$/.test(documento.trim())) {
      lista.push(
        'Escriba el documento sin espacios ni puntos (entre 4 y 20 números, letras o guiones).',
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) {
      lista.push('Escriba un correo institucional válido.');
    }
    if (!idPrograma) lista.push('Seleccione el programa.');
    if (envio.modo === 'crear') {
      if (roles.some((fila) => !fila.idRol)) {
        lista.push('Seleccione el rol en cada fila, o quite las que sobran.');
      }
      const pares = roles.map((fila) => `${fila.idRol}@${fila.idPrograma}`);
      if (new Set(pares).size !== pares.length) {
        lista.push('Un rol no puede repetirse sobre el mismo programa.');
      }
    }
    return lista;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const pendientes = faltantes();
    if (pendientes.length > 0) {
      setError({ mensaje: 'Revise el formulario:', detalles: pendientes });
      return;
    }
    setError(null);
    setGuardando(true);
    const datos = {
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      identificacion: documento.trim(),
      correo: correo.trim().toLowerCase(),
      idPrograma: Number(idPrograma),
    };
    try {
      if (envio.modo === 'crear') {
        await envio.guardar({
          ...datos,
          roles: roles.map((fila) => ({
            idRol: Number(fila.idRol),
            idPrograma: fila.idPrograma ? Number(fila.idPrograma) : null,
          })),
        });
      } else {
        const { usuario } = envio;
        const cambios: CambiosUsuario = {};
        if (datos.nombres !== usuario.nombres) cambios.nombres = datos.nombres;
        if (datos.apellidos !== usuario.apellidos) {
          cambios.apellidos = datos.apellidos;
        }
        if (datos.identificacion !== (usuario.identificacion ?? '')) {
          cambios.identificacion = datos.identificacion;
        }
        if (datos.correo !== usuario.correo) cambios.correo = datos.correo;
        if (datos.idPrograma !== usuario.idPrograma) {
          cambios.idPrograma = datos.idPrograma;
        }
        await envio.guardar(cambios);
      }
    } catch (fallo) {
      setError({
        mensaje: mensajeParaUsuario(fallo),
        detalles: fallo instanceof ErrorApi ? fallo.detalles : undefined,
      });
    } finally {
      setGuardando(false);
    }
  }

  const clase =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  return (
    <form
      onSubmit={(evento) => void enviar(evento)}
      noValidate
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={ids.nombres} className="block font-medium">
            Nombres
          </label>
          <input
            id={ids.nombres}
            value={nombres}
            maxLength={100}
            autoComplete="off"
            onChange={(evento) => setNombres(evento.target.value)}
            className={clase}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.apellidos} className="block font-medium">
            Apellidos
          </label>
          <input
            id={ids.apellidos}
            value={apellidos}
            maxLength={100}
            autoComplete="off"
            onChange={(evento) => setApellidos(evento.target.value)}
            className={clase}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.documento} className="block font-medium">
            Documento de identidad
          </label>
          <input
            id={ids.documento}
            value={documento}
            maxLength={20}
            inputMode="numeric"
            autoComplete="off"
            aria-describedby={`${ids.documento}-ayuda`}
            onChange={(evento) => setDocumento(evento.target.value)}
            className={clase}
          />
          <p id={`${ids.documento}-ayuda`} className="text-sm text-slate-600">
            Sin espacios ni puntos. Solo lo ve quien administra usuarios.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.correo} className="block font-medium">
            Correo institucional
          </label>
          <input
            id={ids.correo}
            type="email"
            value={correo}
            maxLength={255}
            autoComplete="off"
            autoCapitalize="none"
            aria-describedby={`${ids.correo}-ayuda`}
            onChange={(evento) => setCorreo(evento.target.value)}
            className={clase}
          />
          <p id={`${ids.correo}-ayuda`} className="text-sm text-slate-600">
            Con este correo inicia sesión.
          </p>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor={ids.programa} className="block font-medium">
            Programa al que pertenece
          </label>
          <select
            id={ids.programa}
            value={idPrograma}
            onChange={(evento) => setIdPrograma(evento.target.value)}
            className={clase}
          >
            <option value="">Seleccione…</option>
            {opciones.programas.map((programa) => (
              <option key={programa.id} value={programa.id}>
                {programa.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {envio.modo === 'crear' && (
        <fieldset className="space-y-3">
          <legend className="font-medium">Roles</legend>
          <p id={ids.roles} className="text-sm text-slate-600">
            Asigne uno o varios. Cada rol se ejerce sobre un programa; «Todos
            los programas» es para roles como el de Administrador.
          </p>
          <ul className="space-y-3">
            {roles.map((fila, indice) => (
              <li
                key={fila.clave}
                className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              >
                <div className="space-y-1">
                  <label
                    htmlFor={`${ids.roles}-rol-${fila.clave}`}
                    className="block text-sm font-medium"
                  >
                    Rol {indice + 1}
                  </label>
                  <select
                    id={`${ids.roles}-rol-${fila.clave}`}
                    value={fila.idRol}
                    onChange={(evento) =>
                      cambiarRol(fila.clave, { idRol: evento.target.value })
                    }
                    className={clase}
                  >
                    <option value="">Seleccione…</option>
                    {opciones.roles.map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`${ids.roles}-programa-${fila.clave}`}
                    className="block text-sm font-medium"
                  >
                    Sobre el programa
                  </label>
                  <select
                    id={`${ids.roles}-programa-${fila.clave}`}
                    value={fila.idPrograma}
                    onChange={(evento) =>
                      cambiarRol(fila.clave, {
                        idPrograma: evento.target.value,
                      })
                    }
                    className={clase}
                  >
                    <option value="">Todos los programas</option>
                    {opciones.programas.map((programa) => (
                      <option key={programa.id} value={programa.id}>
                        {programa.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {roles.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRoles((filas) =>
                        filas.filter((otra) => otra.clave !== fila.clave),
                      )
                    }
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Quitar
                    <span className="sr-only"> el rol {indice + 1}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setRoles((filas) => [
                ...filas,
                { clave: siguienteClave, idRol: '', idPrograma: idPrograma },
              ]);
              setSiguienteClave(siguienteClave + 1);
            }}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50"
          >
            Agregar otro rol
          </button>
        </fieldset>
      )}

      {error && (
        <AvisoError mensaje={error.mensaje} detalles={error.detalles} />
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={guardando}
          className="min-h-11 rounded-lg bg-marca px-4 py-2 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60"
        >
          {guardando
            ? 'Guardando…'
            : envio.modo === 'crear'
              ? 'Crear el usuario'
              : 'Guardar los cambios'}
        </button>
        <Link
          href={rutaCancelar}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
