'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  consultarPreparacionDuplicado,
  duplicarProyectoDocente,
  MAXIMO_DOCENTES,
  nombreDocente,
  type PreparacionDuplicado,
} from '@/api/proyectos-docentes';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { cantidad, lineasDeContenido } from './textos';

const claseControl = 'mt-1 size-5 shrink-0 accent-marca';
const claseTarjeta =
  'space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6';
const claseBotonPrincipal =
  'w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60 sm:w-auto sm:py-2';

interface DocenteElegido {
  idUsuario: number;
  responsable: boolean;
}

/**
 * Duplicar un proyecto docente (RF-09; HU-05-04). El Departamento académico elige el período,
 * el grupo y los docentes del proyecto nuevo; lo demás se copia del origen y se edita después,
 * por secciones. El backend valida todo otra vez: esta pantalla solo ayuda a no equivocarse.
 */
export function DuplicarProyecto() {
  const { id } = useParams<{ id: string }>();
  const idOrigen = /^\d+$/.test(id) ? Number(id) : null;
  const preparacion = useConsulta(
    idOrigen === null ? null : `duplicar-${idOrigen}`,
    (senal) => consultarPreparacionDuplicado(idOrigen!, senal),
  );

  return (
    <section className="space-y-6">
      <Link
        href={
          idOrigen === null
            ? '/proyectos-docentes'
            : `/proyectos-docentes/${idOrigen}`
        }
        className="relative inline-block text-sm font-medium text-marca after:absolute after:inset-x-0 after:-inset-y-3 hover:underline"
      >
        ← Proyecto de origen
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Duplicar el proyecto docente
        </h1>
        <p className="text-slate-700">
          El proyecto nuevo copia los puntos 2 a 7 y empieza en
          diligenciamiento. Elija el período, el grupo y los docentes.
        </p>
      </div>

      {idOrigen === null && (
        <AvisoError mensaje="El proyecto docente no existe o no tiene acceso a él." />
      )}
      {preparacion.estado === 'cargando' && <Cargando />}
      {preparacion.estado === 'fallida' && (
        <AvisoError
          mensaje={preparacion.mensaje}
          reintentar={
            preparacion.reintentable ? preparacion.reintentar : undefined
          }
        />
      )}
      {preparacion.estado === 'lista' && idOrigen !== null && (
        <Formulario idOrigen={idOrigen} preparacion={preparacion.datos} />
      )}
    </section>
  );
}

function Formulario({
  idOrigen,
  preparacion,
}: {
  idOrigen: number;
  preparacion: PreparacionDuplicado;
}) {
  const id = useId();
  const router = useRouter();
  const { origen, contenido, periodos, avisoRap } = preparacion;
  const [idPeriodo, setIdPeriodo] = useState<string>(
    String(preparacion.idPeriodoSugerido ?? periodos[0]?.id ?? ''),
  );
  const [grupo, setGrupo] = useState('');
  const [docentes, setDocentes] = useState<DocenteElegido[]>(
    preparacion.docentesSugeridos,
  );
  const [idsRap, setIdsRap] = useState<number[]>(preparacion.idsRapSugeridos);
  const [porConfirmar, setPorConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const botonDuplicar = useRef<HTMLButtonElement>(null);

  const periodo = periodos.find((p) => String(p.id) === idPeriodo) ?? null;

  function alternarDocente(idUsuario: number) {
    setError(null);
    setDocentes((actuales) => {
      if (actuales.some((docente) => docente.idUsuario === idUsuario)) {
        const restantes = actuales.filter(
          (docente) => docente.idUsuario !== idUsuario,
        );
        // Si se quita al responsable, el primero que quede pasa a serlo.
        if (
          restantes.length > 0 &&
          !restantes.some((docente) => docente.responsable)
        ) {
          restantes[0] = { ...restantes[0], responsable: true };
        }
        return restantes;
      }
      if (actuales.length >= MAXIMO_DOCENTES) {
        return actuales;
      }
      return [...actuales, { idUsuario, responsable: actuales.length === 0 }];
    });
  }

  function marcarResponsable(idUsuario: number) {
    setDocentes((actuales) =>
      actuales.map((docente) => ({
        ...docente,
        responsable: docente.idUsuario === idUsuario,
      })),
    );
  }

  function alternarRap(idRap: number) {
    setError(null);
    setIdsRap((actuales) =>
      actuales.includes(idRap)
        ? actuales.filter((actual) => actual !== idRap)
        : [...actuales, idRap],
    );
  }

  function pedirConfirmacion() {
    if (!periodo) {
      setError('Elija el período del proyecto nuevo.');
      return;
    }
    if (docentes.length === 0) {
      setError('Asigne al menos un docente y marque cuál es el responsable.');
      return;
    }
    if (avisoRap && idsRap.length === 0) {
      setError('Seleccione al menos un RAP.');
      return;
    }
    setError(null);
    setPorConfirmar(true);
  }

  async function duplicar() {
    setGuardando(true);
    try {
      const nuevo = await duplicarProyectoDocente(idOrigen, {
        idPeriodo: periodo?.id,
        grupo: grupo.trim() || undefined,
        docentes,
        // Sin aviso, el backend copia los RAP del origen tal como están.
        idsRap: avisoRap ? idsRap : undefined,
      });
      router.push(`/proyectos-docentes/${nuevo.id}?duplicado=1`);
    } catch (causa) {
      setError(mensajeParaUsuario(causa));
      setPorConfirmar(false);
      setGuardando(false);
    }
  }

  // Al cancelar, el foco vuelve al botón que abrió la confirmación.
  const confirmacionAbierta = useRef(false);
  useEffect(() => {
    if (!porConfirmar && confirmacionAbierta.current) {
      botonDuplicar.current?.focus();
    }
    confirmacionAbierta.current = porConfirmar;
  }, [porConfirmar]);

  const textoGrupo = grupo.trim() ? `, grupo ${grupo.trim()}` : '';

  return (
    <>
      <section aria-labelledby={`${id}-origen`} className={claseTarjeta}>
        <h2 id={`${id}-origen`} className="text-lg font-semibold">
          Proyecto de origen
        </h2>
        <p className="font-semibold">{origen.asignatura}</p>
        <div className="flex flex-wrap gap-1.5">
          {origen.estado && (
            <Insignia tono="marca">{origen.estado.nombre}</Insignia>
          )}
          <Insignia>Período {origen.periodo}</Insignia>
          {origen.grupo && <Insignia>Grupo {origen.grupo}</Insignia>}
        </div>
        <p className="text-sm text-slate-700">
          {origen.docentes.map(nombreDocente).join(', ') || 'Sin docentes'}
        </p>
      </section>

      <section aria-labelledby={`${id}-copia`} className={claseTarjeta}>
        <h2 id={`${id}-copia`} className="text-lg font-semibold">
          Qué se copia
        </h2>
        <ul className="divide-y divide-slate-100">
          {lineasDeContenido(contenido).map(
            ({ punto, nombre, detalle, vacio }) => (
              <li
                key={punto}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <span>
                  <span className="font-medium">
                    {punto}. {nombre}
                  </span>
                </span>
                <span
                  className={`text-right text-sm ${vacio ? 'text-amber-800' : 'text-slate-700'}`}
                >
                  {detalle}
                </span>
              </li>
            ),
          )}
        </ul>
        <p className="text-sm text-slate-600">
          No se copian las revisiones, el horario, las clases, las evidencias,
          los matriculados ni las mediciones. El proyecto de origen no cambia.
        </p>
      </section>

      <form
        aria-labelledby={`${id}-nuevo`}
        className={claseTarjeta}
        onSubmit={(evento) => {
          evento.preventDefault();
          pedirConfirmacion();
        }}
      >
        <h2 id={`${id}-nuevo`} className="text-lg font-semibold">
          El proyecto nuevo
        </h2>

        <div className="space-y-1.5">
          <label htmlFor={`${id}-periodo`} className="block font-semibold">
            Período académico
          </label>
          {periodos.length === 0 ? (
            <AvisoError mensaje="No hay un período académico abierto. El administrador debe configurarlo antes de duplicar proyectos." />
          ) : (
            <select
              id={`${id}-periodo`}
              value={idPeriodo}
              onChange={(evento) => {
                setError(null);
                setIdPeriodo(evento.target.value);
              }}
              className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              {periodos.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.codigo}
                  {opcion.numeroSemanas
                    ? ` · ${opcion.numeroSemanas} semanas`
                    : ''}
                </option>
              ))}
            </select>
          )}
          {periodo && periodo.semanasQueNoCaben > 0 && (
            <Advertencia titulo="Algunas semanas de contenido no caben">
              <p>
                El período {periodo.codigo} tiene {periodo.numeroSemanas}{' '}
                semanas:{' '}
                {cantidad(periodo.semanasQueNoCaben, 'semana', 'semanas')} del
                contenido de origen no se copian.
              </p>
            </Advertencia>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${id}-grupo`} className="block font-semibold">
            Grupo
          </label>
          <input
            id={`${id}-grupo`}
            value={grupo}
            maxLength={20}
            autoComplete="off"
            onChange={(evento) => {
              setError(null);
              setGrupo(evento.target.value);
            }}
            aria-describedby={`${id}-grupo-ayuda`}
            className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
          <p id={`${id}-grupo-ayuda`} className="text-sm text-slate-600">
            {origen.grupo
              ? `El origen es del grupo ${origen.grupo}. `
              : 'El origen no tiene grupo. '}
            Déjelo vacío si la asignatura tiene un solo grupo en el período.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="font-semibold">Docentes</legend>
          <p className="text-sm text-slate-600">
            Vienen marcados los del origen. Seleccione hasta {MAXIMO_DOCENTES} y
            marque al responsable: es quien diligencia el proyecto y firma
            «elaboró».
          </p>
          {preparacion.docentes.length === 0 && (
            <Advertencia titulo="El programa no tiene docentes registrados">
              <p>El administrador debe asignar el rol Docente responsable.</p>
            </Advertencia>
          )}
          {preparacion.docentes.map((docente) => {
            const elegido = docentes.find((d) => d.idUsuario === docente.id);
            const lleno = !elegido && docentes.length >= MAXIMO_DOCENTES;
            return (
              <div
                key={docente.id}
                className="rounded-xl border border-slate-200 bg-white has-checked:border-marca has-checked:bg-marca/5"
              >
                <label
                  className={`flex items-start gap-3 p-4 ${lleno ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(elegido)}
                    disabled={lleno}
                    onChange={() => alternarDocente(docente.id)}
                    className={claseControl}
                  />
                  <span>
                    <span className="block font-semibold">
                      {nombreDocente(docente)}
                    </span>
                    <span className="block text-sm break-all text-slate-600">
                      {docente.correo}
                    </span>
                  </span>
                </label>
                {elegido && (
                  <label className="flex cursor-pointer items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm">
                    <input
                      type="radio"
                      name={`${id}-responsable`}
                      checked={elegido.responsable}
                      onChange={() => marcarResponsable(docente.id)}
                      className="size-5 accent-marca"
                    />
                    Responsable (firma «elaboró»)
                  </label>
                )}
              </div>
            );
          })}
        </fieldset>

        {avisoRap && (
          <fieldset className="space-y-3">
            <legend className="font-semibold">RAP a los que contribuye</legend>
            <Advertencia titulo={avisoRap.mensaje}>
              {avisoRap.retirados.length > 0 && (
                <p>
                  Ya no están en la asignatura o se inactivaron:{' '}
                  {avisoRap.retirados
                    .map((rap) => rap.codigo ?? `RAP ${rap.numero}`)
                    .join(', ')}
                  .
                </p>
              )}
              {avisoRap.nuevos.length > 0 && (
                <p>
                  La asignatura ahora tiene:{' '}
                  {avisoRap.nuevos
                    .map((rap) => rap.codigo ?? `RAP ${rap.numero}`)
                    .join(', ')}
                  .
                </p>
              )}
              <p>
                Si quita un RAP, los RAC copiados pierden su relación con él.
              </p>
            </Advertencia>
            {preparacion.raps.map((rap) => (
              <label
                key={rap.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 has-checked:border-marca has-checked:bg-marca/5"
              >
                <input
                  type="checkbox"
                  checked={idsRap.includes(rap.id)}
                  onChange={() => alternarRap(rap.id)}
                  className={claseControl}
                />
                <span>
                  <span className="block font-semibold">
                    {rap.codigo ?? `RAP ${rap.numero}`}
                    {rap.mapeado && (
                      <span className="ml-2 align-middle">
                        <Insignia>En la asignatura</Insignia>
                      </span>
                    )}
                  </span>
                  {rap.descripcion && (
                    <span className="block text-sm text-slate-700">
                      {rap.descripcion}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {error && <AvisoError mensaje={error} />}

        {porConfirmar && periodo ? (
          <div
            role="alertdialog"
            aria-labelledby={`${id}-confirmar`}
            className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-3"
          >
            <p id={`${id}-confirmar`} className="text-sm">
              ¿Duplicar el proyecto? Se creará el proyecto docente de{' '}
              {origen.asignatura}, período {periodo.codigo}
              {textoGrupo}, en diligenciamiento y con los puntos 2 a 7 copiados.
              Los docentes asignados recibirán un aviso.
            </p>
            <BotonesConfirmacion
              guardando={guardando}
              alConfirmar={() => void duplicar()}
              alCancelar={() => setPorConfirmar(false)}
            />
          </div>
        ) : (
          <button
            ref={botonDuplicar}
            type="submit"
            disabled={periodos.length === 0}
            className={claseBotonPrincipal}
          >
            Duplicar el proyecto
          </button>
        )}
      </form>
    </>
  );
}

/** «Sí» recibe el foco al abrir la confirmación: el botón pulsado desaparece. */
function BotonesConfirmacion({
  guardando,
  alConfirmar,
  alCancelar,
}: {
  guardando: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  const botonSi = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botonSi.current?.focus();
  }, []);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        ref={botonSi}
        type="button"
        disabled={guardando}
        onClick={alConfirmar}
        className={claseBotonPrincipal}
      >
        {guardando ? 'Duplicando…' : 'Sí, duplicar el proyecto'}
      </button>
      <button
        type="button"
        disabled={guardando}
        onClick={alCancelar}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60 sm:w-auto sm:py-2"
      >
        Cancelar
      </button>
    </div>
  );
}
