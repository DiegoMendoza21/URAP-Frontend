'use client';

import { useId, useState, type FormEvent } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  asignarRol,
  consultarHistorialRoles,
  consultarOpcionesUsuarios,
  type DetalleUsuario,
  type EventoRol,
  nombreCompleto,
  revocarRol,
  type RolVigente,
  textoRol,
} from '@/api/usuarios';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { Confirmacion } from '../_componentes/Confirmacion';
import { momento } from '../_componentes/momento';

/**
 * Roles de un usuario (HU-02-07): los vigentes, con su programa y desde cuándo; y, para quien
 * administra, asignar otro, revocar uno (con confirmación) y el historial de quién tuvo qué
 * rol y cuándo. La revocación es lógica: el rol sale de los vigentes y queda en el historial.
 */
export function RolesUsuario({
  usuario,
  puedeAdministrar,
  alCambiar,
}: {
  usuario: DetalleUsuario;
  puedeAdministrar: boolean;
  /** El usuario como quedó después de asignar o revocar. */
  alCambiar: (usuario: DetalleUsuario) => void;
}) {
  const [porRevocar, setPorRevocar] = useState<RolVigente | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Cambia con cada asignación o revocación, para volver a pedir el historial. */
  const [cambios, setCambios] = useState(0);

  async function revocar(rol: RolVigente) {
    setError(null);
    setAviso(null);
    setOcupado(true);
    try {
      alCambiar(await revocarRol(usuario.id, rol.id));
      setCambios((valor) => valor + 1);
      setAviso(`Se revocó el rol «${textoRol(rol)}».`);
    } catch (fallo) {
      setError(mensajeParaUsuario(fallo));
    } finally {
      setOcupado(false);
      setPorRevocar(null);
    }
  }

  return (
    <>
      <section
        aria-labelledby="titulo-roles"
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 id="titulo-roles" className="text-lg font-semibold">
          Roles vigentes
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
        {usuario.roles.length === 0 ? (
          <p className="text-slate-700">
            No tiene roles vigentes: no puede iniciar sesión hasta que se le
            asigne uno.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {usuario.roles.map((rol) => (
              <li key={rol.id} className="space-y-2 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {textoRol(rol)}
                    </p>
                    {rol.fechaAsignacion && (
                      <p className="text-sm text-slate-600">
                        Desde el {momento(rol.fechaAsignacion)}
                      </p>
                    )}
                  </div>
                  {puedeAdministrar && porRevocar?.id !== rol.id && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => {
                        setError(null);
                        setAviso(null);
                        setPorRevocar(rol);
                      }}
                      className="min-h-11 rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
                    >
                      Revocar
                      <span className="sr-only"> el rol {textoRol(rol)}</span>
                    </button>
                  )}
                </div>
                {porRevocar?.id === rol.id && (
                  <Confirmacion
                    textoConfirmar="Sí, revocar el rol"
                    peligro
                    ocupado={ocupado}
                    alConfirmar={() => void revocar(rol)}
                    alCancelar={() => setPorRevocar(null)}
                  >
                    <p>
                      ¿Revocar a <strong>{nombreCompleto(usuario)}</strong> el
                      rol <strong>{textoRol(rol)}</strong>? Deja de tener sus
                      permisos de inmediato. Queda en el historial y se le puede
                      volver a asignar.
                    </p>
                  </Confirmacion>
                )}
              </li>
            ))}
          </ul>
        )}

        {puedeAdministrar && (
          <AsignarRol
            usuario={usuario}
            alAsignar={(nuevo, texto) => {
              alCambiar(nuevo);
              setCambios((valor) => valor + 1);
              setError(null);
              setAviso(`Se asignó el rol «${texto}».`);
            }}
          />
        )}
      </section>

      {puedeAdministrar && (
        <Historial idUsuario={usuario.id} cambios={cambios} />
      )}
    </>
  );
}

/** Formulario para asignar otro rol: el rol y el programa sobre el que se ejerce. */
function AsignarRol({
  usuario,
  alAsignar,
}: {
  usuario: DetalleUsuario;
  alAsignar: (usuario: DetalleUsuario, texto: string) => void;
}) {
  const ids = { rol: useId(), programa: useId() };
  const opciones = useConsulta('usuarios-opciones', consultarOpcionesUsuarios);
  const [idRol, setIdRol] = useState('');
  const [idPrograma, setIdPrograma] = useState(
    usuario.idPrograma === null ? '' : String(usuario.idPrograma),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (opciones.estado !== 'lista') {
    return opciones.estado === 'fallida' ? (
      <AvisoError
        mensaje={opciones.mensaje}
        reintentar={opciones.reintentable ? opciones.reintentar : undefined}
      />
    ) : null;
  }
  const { roles, programas } = opciones.datos;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!idRol) {
      setError('Seleccione el rol que va a asignar.');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const nuevo = await asignarRol(usuario.id, {
        idRol: Number(idRol),
        idPrograma: idPrograma ? Number(idPrograma) : null,
      });
      const rol = roles.find((opcion) => opcion.id === Number(idRol));
      const programa = programas.find(
        (opcion) => opcion.id === Number(idPrograma),
      );
      alAsignar(
        nuevo,
        textoRol({
          rol: rol?.nombre ?? '',
          programa: programa?.nombre ?? null,
        }),
      );
      setIdRol('');
    } catch (fallo) {
      setError(mensajeParaUsuario(fallo));
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
      aria-label="Asignar un rol"
      className="space-y-3 rounded-xl border border-slate-200 p-3"
    >
      <p className="font-medium">Asignar otro rol</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1">
          <label htmlFor={ids.rol} className="block text-sm font-medium">
            Rol
          </label>
          <select
            id={ids.rol}
            value={idRol}
            onChange={(evento) => setIdRol(evento.target.value)}
            className={clase}
          >
            <option value="">Seleccione…</option>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {rol.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={ids.programa} className="block text-sm font-medium">
            Sobre el programa
          </label>
          <select
            id={ids.programa}
            value={idPrograma}
            onChange={(evento) => setIdPrograma(evento.target.value)}
            className={clase}
          >
            <option value="">Todos los programas</option>
            {programas.map((programa) => (
              <option key={programa.id} value={programa.id}>
                {programa.nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="min-h-11 rounded-lg bg-marca px-4 py-2 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60"
        >
          {guardando ? 'Asignando…' : 'Asignar el rol'}
        </button>
      </div>
      {error && <AvisoError mensaje={error} />}
    </form>
  );
}

/** Quién tuvo qué rol y cuándo, del cambio más reciente al más antiguo. */
function Historial({
  idUsuario,
  cambios,
}: {
  idUsuario: number;
  cambios: number;
}) {
  const historial = useConsulta(
    `usuario-${idUsuario}-historial-${cambios}`,
    (senal) => consultarHistorialRoles(idUsuario, senal),
  );
  return (
    <section
      aria-labelledby="titulo-historial"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="titulo-historial" className="text-lg font-semibold">
        Historial de roles
      </h2>
      {historial.estado === 'cargando' && <Cargando />}
      {historial.estado === 'fallida' && (
        <AvisoError
          mensaje={historial.mensaje}
          reintentar={historial.reintentable ? historial.reintentar : undefined}
        />
      )}
      {historial.estado === 'lista' &&
        (historial.datos.eventos.length === 0 ? (
          <p className="text-slate-700">
            Todavía no hay asignaciones ni revocaciones registradas.
          </p>
        ) : (
          <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {historial.datos.eventos.map((evento, indice) => (
              <li
                key={`${evento.idAsignacion}-${evento.tipo}-${evento.fecha}-${indice}`}
                className="space-y-1 px-3 py-3"
              >
                <Evento evento={evento} />
              </li>
            ))}
          </ol>
        ))}
    </section>
  );
}

function Evento({ evento }: { evento: EventoRol }) {
  const asignacion = evento.tipo === 'asignacion';
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Insignia tono={asignacion ? 'marca' : 'peligro'}>
          {asignacion ? 'Asignado' : 'Revocado'}
        </Insignia>
        <span className="font-medium text-slate-900">{textoRol(evento)}</span>
      </div>
      <p className="text-sm text-slate-600">
        {momento(evento.fecha) ?? 'Sin fecha'}
        {' · '}
        {evento.realizadoPor
          ? `Por ${evento.realizadoPor}`
          : 'Sin registro de quién lo hizo'}
      </p>
    </>
  );
}
