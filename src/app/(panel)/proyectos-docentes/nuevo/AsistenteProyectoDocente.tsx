'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  type AsignaturaOpcion,
  consultarAsignaturas,
  consultarDocentes,
  consultarInformacionAsignatura,
  consultarProgramas,
  consultarProyectoExistente,
  crearProyectoDocente,
  etiquetaPlan,
  MAXIMO_DOCENTES,
  nombreDocente,
  type ProyectoDocenteDetalle,
} from '@/api/proyectos-docentes';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../_componentes/Estados';
import { InformacionGeneral } from '../_componentes/InformacionGeneral';
import { useConsulta } from '../_componentes/useConsulta';

/** Los cuatro pasos de RF-08: programa, asignatura, RAP y revisión. */
const PASOS = ['Programa', 'Asignatura', 'RAP', 'Revisión'] as const;
type Paso = 1 | 2 | 3 | 4;

interface DocenteElegido {
  idUsuario: number;
  responsable: boolean;
}

interface Falla {
  mensaje: string;
  detalles?: string[];
}

const claseOpcion =
  'flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-marca/50 has-checked:border-marca has-checked:bg-marca/5 has-disabled:cursor-not-allowed has-disabled:opacity-60';
const claseControl = 'mt-1 size-5 shrink-0 accent-marca';
const claseBotonPrincipal =
  'w-full rounded-lg bg-marca px-4 py-3 text-base font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-60 sm:w-auto';
const claseBotonSecundario =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca sm:w-auto';

/**
 * Asistente para crear el proyecto docente (RF-08; HU-05-01, HU-05-02 y HU-05-03). Lo usa el
 * Departamento académico; el backend valida cada dato y el alcance sobre el programa.
 */
export function AsistenteProyectoDocente() {
  const id = useId();
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const [paso, setPaso] = useState<Paso>(1);
  const [idPrograma, setIdPrograma] = useState<number | null>(null);
  const [idAsignatura, setIdAsignatura] = useState<number | null>(null);
  const [filtroAsignatura, setFiltroAsignatura] = useState('');
  /** Plan de estudios por el que se filtra la lista de asignaturas; nulo: todos. */
  const [idPlanFiltro, setIdPlanFiltro] = useState<number | null>(null);
  /** Nulo mientras el usuario no toque la selección: se proponen los RAP del mapeo. */
  const [rapsElegidos, setRapsElegidos] = useState<number[] | null>(null);
  const [docentes, setDocentes] = useState<DocenteElegido[]>([]);
  const [grupo, setGrupo] = useState('');
  const [grupoConsultado, setGrupoConsultado] = useState('');
  const [errorPaso, setErrorPaso] = useState<string | null>(null);
  const [falla, setFalla] = useState<Falla | null>(null);
  const [creando, setCreando] = useState(false);
  const [creado, setCreado] = useState<ProyectoDocenteDetalle | null>(null);

  const programas = useConsulta('programas', consultarProgramas);
  const programaUnico =
    programas.estado === 'lista' && programas.datos.length === 1
      ? programas.datos[0].id
      : null;
  const programa = idPrograma ?? programaUnico;

  const asignaturas = useConsulta(
    programa === null ? null : `asignaturas-${programa}`,
    (senal) => consultarAsignaturas(programa!, senal),
  );
  const planes = useMemo(
    () => (asignaturas.estado === 'lista' ? planesDe(asignaturas.datos) : []),
    [asignaturas],
  );
  const informacion = useConsulta(
    idAsignatura === null ? null : `informacion-${idAsignatura}`,
    (senal) => consultarInformacionAsignatura(idAsignatura!, senal),
  );
  const docentesPrograma = useConsulta(
    programa === null || paso < 4 ? null : `docentes-${programa}`,
    (senal) => consultarDocentes(programa!, senal),
  );
  const existente = useConsulta(
    idAsignatura === null || paso < 4
      ? null
      : `existente-${idAsignatura}-${grupoConsultado}`,
    (senal) =>
      consultarProyectoExistente(idAsignatura!, grupoConsultado, senal),
  );

  const mapeados = useMemo(
    () =>
      informacion.estado === 'lista'
        ? informacion.datos.raps
            .filter((rap) => rap.mapeado)
            .map((rap) => rap.id)
        : [],
    [informacion],
  );
  const raps = rapsElegidos ?? mapeados;

  // Al cambiar de paso, el foco va al título del paso para lectores de pantalla y teclado.
  const pasoAnterior = useRef(paso);
  useEffect(() => {
    if (pasoAnterior.current !== paso) {
      pasoAnterior.current = paso;
      refTitulo.current?.focus();
    }
  }, [paso]);

  function irA(destino: Paso) {
    setErrorPaso(null);
    setFalla(null);
    setPaso(destino);
  }

  function elegirPrograma(nuevo: number) {
    if (nuevo !== programa) {
      setIdAsignatura(null);
      setIdPlanFiltro(null);
      setRapsElegidos(null);
      setDocentes([]);
    }
    setIdPrograma(nuevo);
    setErrorPaso(null);
  }

  function elegirAsignatura(nueva: number) {
    if (nueva !== idAsignatura) {
      setRapsElegidos(null);
    }
    setIdAsignatura(nueva);
    setErrorPaso(null);
  }

  function alternarRap(idRap: number) {
    setRapsElegidos(
      raps.includes(idRap)
        ? raps.filter((rap) => rap !== idRap)
        : [...raps, idRap],
    );
    setErrorPaso(null);
  }

  function alternarDocente(idUsuario: number) {
    setErrorPaso(null);
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

  function continuar() {
    if (paso === 1) {
      if (programa === null) {
        setErrorPaso('Seleccione el programa académico para continuar.');
        return;
      }
      irA(2);
    } else if (paso === 2) {
      if (idAsignatura === null) {
        setErrorPaso('Seleccione la asignatura para continuar.');
        return;
      }
      irA(3);
    } else if (paso === 3) {
      // RF-08, p4: sin al menos un RAP no se avanza.
      if (raps.length === 0) {
        setErrorPaso(
          'Seleccione al menos un RAP del programa al que contribuye la asignatura.',
        );
        return;
      }
      irA(4);
    }
  }

  async function crear() {
    if (idAsignatura === null) {
      return;
    }
    if (docentes.length === 0) {
      setErrorPaso(
        'Asigne al menos un docente y marque cuál es el responsable.',
      );
      return;
    }
    setErrorPaso(null);
    setFalla(null);
    setCreando(true);
    try {
      const proyecto = await crearProyectoDocente({
        idAsignatura,
        idsRap: raps,
        docentes,
        ...(grupo.trim() ? { grupo: grupo.trim() } : {}),
      });
      setCreado(proyecto);
    } catch (error) {
      setFalla({
        mensaje: mensajeParaUsuario(error),
        detalles: error instanceof ErrorApi ? error.detalles : undefined,
      });
      // p6: si otro usuario lo creó mientras tanto, se vuelve a consultar para ofrecerlo.
      if (error instanceof ErrorApi && error.estado === 409) {
        existente.reintentar();
      }
    } finally {
      setCreando(false);
    }
  }

  if (creado) {
    return <ProyectoCreado proyecto={creado} />;
  }

  const datosInformacion =
    informacion.estado === 'lista' ? informacion.datos : null;
  const proyectoExistente =
    existente.estado === 'lista' ? existente.datos.proyecto : null;
  const sinPeriodo =
    datosInformacion !== null && datosInformacion.periodo === null;

  return (
    <section aria-labelledby={`${id}-titulo`} className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/proyectos-docentes"
          className="relative inline-block after:absolute after:inset-x-0 after:-inset-y-3 text-sm font-medium text-marca hover:underline"
        >
          ← Proyectos docentes
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Nuevo proyecto docente
        </h1>
      </div>

      <IndicadorPasos paso={paso} />

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2
          id={`${id}-titulo`}
          ref={refTitulo}
          tabIndex={-1}
          className="text-lg font-semibold outline-none sm:text-xl"
        >
          {
            {
              1: 'Seleccione el programa académico',
              2: 'Seleccione la asignatura',
              3: 'Seleccione los RAP a los que contribuye la asignatura',
              4: 'Revise la información y asigne los docentes',
            }[paso]
          }
        </h2>

        {errorPaso && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {errorPaso}
          </p>
        )}

        {paso === 1 && (
          <fieldset className="space-y-3">
            <legend className="sr-only">Programa académico</legend>
            {programas.estado === 'cargando' && <Cargando />}
            {programas.estado === 'fallida' && (
              <AvisoError
                mensaje={programas.mensaje}
                reintentar={
                  programas.reintentable ? programas.reintentar : undefined
                }
              />
            )}
            {programas.estado === 'lista' && programas.datos.length === 0 && (
              <Advertencia titulo="No tiene programas asignados">
                <p>
                  Solo el departamento académico de un programa puede crear sus
                  proyectos docentes. Comuníquese con el administrador.
                </p>
              </Advertencia>
            )}
            {programas.estado === 'lista' &&
              programas.datos.map((opcion) => (
                <label key={opcion.id} className={claseOpcion}>
                  <input
                    type="radio"
                    name={`${id}-programa`}
                    checked={programa === opcion.id}
                    onChange={() => elegirPrograma(opcion.id)}
                    className={claseControl}
                  />
                  <span>
                    <span className="block font-semibold">{opcion.nombre}</span>
                    {opcion.facultad && (
                      <span className="block text-sm text-slate-600">
                        {opcion.facultad}
                      </span>
                    )}
                  </span>
                </label>
              ))}
          </fieldset>
        )}

        {paso === 2 && (
          <fieldset className="space-y-3">
            <legend className="sr-only">Asignatura</legend>
            {asignaturas.estado === 'cargando' && <Cargando />}
            {asignaturas.estado === 'fallida' && (
              <AvisoError
                mensaje={asignaturas.mensaje}
                reintentar={
                  asignaturas.reintentable ? asignaturas.reintentar : undefined
                }
              />
            )}
            {asignaturas.estado === 'lista' && (
              <>
                {asignaturas.datos.length === 0 ? (
                  <Advertencia titulo="El programa no tiene asignaturas activas">
                    <p>
                      El administrador debe registrarlas antes de crear el
                      proyecto.
                    </p>
                  </Advertencia>
                ) : (
                  <div
                    className={
                      planes.length > 1
                        ? 'grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]'
                        : undefined
                    }
                  >
                    {planes.length > 1 && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`${id}-plan`}
                          className="block text-sm font-medium"
                        >
                          Plan de estudios
                        </label>
                        <select
                          id={`${id}-plan`}
                          value={idPlanFiltro ?? ''}
                          onChange={(evento) =>
                            setIdPlanFiltro(
                              evento.target.value
                                ? Number(evento.target.value)
                                : null,
                            )
                          }
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base focus:border-marca focus:outline-2 focus:outline-marca/30"
                        >
                          <option value="">Todos los planes</option>
                          {planes.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {etiquetaPlan(plan)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`${id}-filtro`}
                        className="block text-sm font-medium"
                      >
                        Buscar por nombre, código o plan
                      </label>
                      <input
                        id={`${id}-filtro`}
                        type="search"
                        value={filtroAsignatura}
                        onChange={(evento) =>
                          setFiltroAsignatura(evento.target.value)
                        }
                        className="block w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-marca focus:outline-2 focus:outline-marca/30"
                      />
                    </div>
                  </div>
                )}
                <ListaAsignaturas
                  nombreGrupo={`${id}-asignatura`}
                  asignaturas={asignaturas.datos}
                  filtro={filtroAsignatura}
                  idPlan={idPlanFiltro}
                  variosPlanes={planes.length > 1}
                  elegida={idAsignatura}
                  alElegir={elegirAsignatura}
                />
              </>
            )}
          </fieldset>
        )}

        {paso === 3 && (
          <fieldset className="space-y-3">
            <legend className="text-sm text-slate-700">
              Los RAP pertenecen al programa. Se proponen marcados los que el
              mapeo curricular ya relaciona con la asignatura; puede cambiarlos.
            </legend>
            {informacion.estado === 'cargando' && <Cargando />}
            {informacion.estado === 'fallida' && (
              <AvisoError
                mensaje={informacion.mensaje}
                reintentar={
                  informacion.reintentable ? informacion.reintentar : undefined
                }
              />
            )}
            {datosInformacion && datosInformacion.raps.length === 0 && (
              <Advertencia titulo="El programa no tiene RAP registrados">
                <p>
                  Sin el catálogo de RAP del programa no se puede crear el
                  proyecto docente.
                </p>
              </Advertencia>
            )}
            {datosInformacion &&
              datosInformacion.raps.length > 0 &&
              !datosInformacion.raps.some((rap) => rap.mapeado) && (
                <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                  La asignatura todavía no tiene mapeo curricular a los RAP
                  {datosInformacion.informacion.planEstudio
                    ? ` en el plan ${datosInformacion.informacion.planEstudio}`
                    : ''}
                  , así que no hay ninguno propuesto. Elija los RAP del programa
                  a los que contribuye.
                </p>
              )}
            {datosInformacion?.raps.map((rap) => (
              <label key={rap.id} className={claseOpcion}>
                <input
                  type="checkbox"
                  checked={raps.includes(rap.id)}
                  onChange={() => alternarRap(rap.id)}
                  className={claseControl}
                />
                <span className="space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {rap.codigo ?? `RAP ${rap.numero}`}
                    </span>
                    {rap.mapeado && (
                      <Insignia tono="marca">
                        Según el mapeo curricular
                      </Insignia>
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
            {datosInformacion && datosInformacion.raps.length > 0 && (
              <p className="text-sm text-slate-600" aria-live="polite">
                {raps.length === 1
                  ? '1 RAP seleccionado'
                  : `${raps.length} RAP seleccionados`}
              </p>
            )}
          </fieldset>
        )}

        {paso === 4 && (
          <div className="space-y-6">
            {informacion.estado === 'cargando' && <Cargando />}
            {informacion.estado === 'fallida' && (
              <AvisoError
                mensaje={informacion.mensaje}
                reintentar={
                  informacion.reintentable ? informacion.reintentar : undefined
                }
              />
            )}
            {datosInformacion && (
              <>
                <section className="space-y-3">
                  <h3 className="font-semibold">1. Información general</h3>
                  <p className="text-sm text-slate-600">
                    El sistema la completa a partir de la asignatura y del
                    período vigente.
                  </p>
                  {sinPeriodo && (
                    <AvisoError mensaje="No hay un período académico activo. El administrador debe configurarlo antes de crear proyectos docentes." />
                  )}
                  <InformacionGeneral
                    informacion={datosInformacion.informacion}
                    periodo={datosInformacion.periodo?.codigo ?? null}
                  />
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold">RAP seleccionados</h3>
                  <ul className="flex flex-wrap gap-2">
                    {datosInformacion.raps
                      .filter((rap) => raps.includes(rap.id))
                      .map((rap) => (
                        <li key={rap.id}>
                          <Insignia tono="marca">
                            {rap.codigo ?? `RAP ${rap.numero}`}
                          </Insignia>
                        </li>
                      ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => irA(3)}
                    className="text-sm font-medium text-marca hover:underline"
                  >
                    Cambiar los RAP
                  </button>
                </section>
              </>
            )}

            <fieldset className="space-y-3">
              <legend className="font-semibold">Docentes</legend>
              <p className="text-sm text-slate-600">
                Seleccione hasta {MAXIMO_DOCENTES} y marque al responsable: es
                quien diligencia el proyecto y firma «elaboró».
              </p>
              {docentesPrograma.estado === 'cargando' && <Cargando />}
              {docentesPrograma.estado === 'fallida' && (
                <AvisoError
                  mensaje={docentesPrograma.mensaje}
                  reintentar={
                    docentesPrograma.reintentable
                      ? docentesPrograma.reintentar
                      : undefined
                  }
                />
              )}
              {docentesPrograma.estado === 'lista' &&
                docentesPrograma.datos.length === 0 && (
                  <Advertencia titulo="El programa no tiene docentes registrados">
                    <p>
                      El administrador debe asignar el rol Docente responsable.
                    </p>
                  </Advertencia>
                )}
              {docentesPrograma.estado === 'lista' &&
                docentesPrograma.datos.map((docente) => {
                  const elegido = docentes.find(
                    (d) => d.idUsuario === docente.id,
                  );
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
              {docentes.length >= MAXIMO_DOCENTES && (
                <p className="text-sm text-slate-600">
                  Ya asignó el máximo de {MAXIMO_DOCENTES} docentes que admite
                  el formato.
                </p>
              )}
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor={`${id}-grupo`} className="block font-semibold">
                Grupo{' '}
                <span className="font-normal text-slate-600">(si aplica)</span>
              </label>
              <input
                id={`${id}-grupo`}
                value={grupo}
                maxLength={20}
                onChange={(evento) => setGrupo(evento.target.value)}
                onBlur={() => setGrupoConsultado(grupo.trim())}
                className="block w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-marca focus:outline-2 focus:outline-marca/30 sm:max-w-40"
              />
              <p className="text-sm text-slate-600">
                Déjelo vacío si la asignatura tiene un solo grupo en el período.
              </p>
            </div>

            {proyectoExistente && (
              <Advertencia titulo="Ya existe un proyecto docente para esta asignatura, período y grupo">
                <p>
                  No se puede crear otro para el mismo curso. Puede abrir el
                  existente o, cuando esté disponible, duplicarlo.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/proyectos-docentes/${proyectoExistente.id}`}
                    className="rounded-lg bg-white px-3 py-2 text-center font-semibold text-marca ring-1 ring-amber-300 hover:bg-amber-100"
                  >
                    Abrir el proyecto existente
                  </Link>
                </div>
              </Advertencia>
            )}

            {falla && (
              <AvisoError mensaje={falla.mensaje} detalles={falla.detalles} />
            )}
          </div>
        )}

        {/* En los pasos largos el aviso se repite junto al botón, donde el usuario lo ve. */}
        {errorPaso && paso === 4 && (
          <p
            aria-hidden="true"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {errorPaso}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
          {paso > 1 ? (
            <button
              type="button"
              onClick={() => irA((paso - 1) as Paso)}
              className={claseBotonSecundario}
            >
              Atrás
            </button>
          ) : (
            <Link
              href="/proyectos-docentes"
              className={`${claseBotonSecundario} text-center`}
            >
              Cancelar
            </Link>
          )}
          {paso < 4 ? (
            <button
              type="button"
              onClick={continuar}
              // Mientras cargan los RAP no hay qué validar: avisar «seleccione un RAP» confunde.
              disabled={paso === 3 && informacion.estado === 'cargando'}
              className={claseBotonPrincipal}
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={crear}
              // No se espera la consulta de p6: se dispara al salir del campo del grupo, y un
              // clic en este botón con el foco en el grupo caería en un botón deshabilitado. Si
              // el curso ya existe, el backend responde 409 y el aviso se vuelve a consultar.
              disabled={
                creando ||
                !datosInformacion ||
                sinPeriodo ||
                Boolean(proyectoExistente)
              }
              className={claseBotonPrincipal}
            >
              {creando ? 'Creando…' : 'Crear proyecto docente'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function IndicadorPasos({ paso }: { paso: Paso }) {
  return (
    <nav aria-label="Pasos del asistente">
      <p className="mb-2 text-sm font-medium text-slate-700 sm:hidden">
        Paso {paso} de {PASOS.length}: {PASOS[paso - 1]}
      </p>
      <ol className="grid grid-cols-4 gap-2">
        {PASOS.map((nombre, indice) => {
          const numero = indice + 1;
          const estado =
            numero < paso
              ? 'completo'
              : numero === paso
                ? 'actual'
                : 'pendiente';
          return (
            <li
              key={nombre}
              aria-current={estado === 'actual' ? 'step' : undefined}
              className="space-y-1"
            >
              <span
                className={`block h-1.5 rounded-full ${estado === 'pendiente' ? 'bg-slate-200' : 'bg-marca'}`}
              />
              <span
                className={`hidden text-sm sm:block ${estado === 'actual' ? 'font-semibold text-marca' : 'text-slate-600'}`}
              >
                {numero}. {nombre}
              </span>
              <span className="sr-only sm:hidden">
                {numero}. {nombre}
                {estado === 'completo' ? ' (completo)' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Planes de estudio de las asignaturas, sin repetir y en el orden en que llegan. */
function planesDe(
  asignaturas: AsignaturaOpcion[],
): AsignaturaOpcion['planEstudio'][] {
  return [
    ...new Map(
      asignaturas.map(({ planEstudio }) => [planEstudio.id, planEstudio]),
    ).values(),
  ];
}

/**
 * Asignaturas del programa. Un programa puede tener varios planes de estudio vigentes y la
 * misma asignatura aparece en cada uno con su código (modelo v2.5): cada opción muestra su
 * plan y, si hay más de uno, la lista se agrupa por plan.
 */
function ListaAsignaturas({
  nombreGrupo,
  asignaturas,
  filtro,
  idPlan,
  variosPlanes,
  elegida,
  alElegir,
}: {
  nombreGrupo: string;
  asignaturas: AsignaturaOpcion[];
  filtro: string;
  /** Plan por el que se filtra; nulo: todos. */
  idPlan: number | null;
  /** Si el programa tiene más de un plan: entonces la lista se agrupa por plan. */
  variosPlanes: boolean;
  elegida: number | null;
  alElegir: (id: number) => void;
}) {
  const termino = normalizar(filtro);
  const visibles = asignaturas.filter(
    (asignatura) =>
      asignatura.id === elegida ||
      ((idPlan === null || asignatura.planEstudio.id === idPlan) &&
        (!termino ||
          normalizar(asignatura.nombre).includes(termino) ||
          normalizar(asignatura.codigo ?? '').includes(termino) ||
          normalizar(etiquetaPlan(asignatura.planEstudio)).includes(termino))),
  );
  if (asignaturas.length > 0 && visibles.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Ninguna asignatura coincide con la búsqueda.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {planesDe(visibles).map((plan) => (
        <div key={plan.id} className="space-y-3">
          {variosPlanes && (
            <h3 className="text-sm font-semibold text-slate-700">
              {plan.nombre ?? etiquetaPlan(plan)}
            </h3>
          )}
          {visibles
            .filter((asignatura) => asignatura.planEstudio.id === plan.id)
            .map((asignatura) => (
              <label key={asignatura.id} className={claseOpcion}>
                <input
                  type="radio"
                  name={nombreGrupo}
                  checked={elegida === asignatura.id}
                  onChange={() => alElegir(asignatura.id)}
                  className={claseControl}
                />
                <span>
                  <span className="block font-semibold">
                    {asignatura.nombre}
                  </span>
                  <span className="block text-sm text-slate-600">
                    {[
                      etiquetaPlan(asignatura.planEstudio),
                      asignatura.codigo,
                      asignatura.semestre
                        ? `Semestre ${asignatura.semestre}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </label>
            ))}
        </div>
      ))}
    </div>
  );
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function ProyectoCreado({ proyecto }: { proyecto: ProyectoDocenteDetalle }) {
  const refTitulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => refTitulo.current?.focus(), []);

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h1
        ref={refTitulo}
        tabIndex={-1}
        className="text-2xl font-bold outline-none"
      >
        Proyecto docente creado
      </h1>
      <p className="text-slate-700">
        <strong>{proyecto.asignatura}</strong>
        {proyecto.planEstudio ? ` (plan ${proyecto.planEstudio})` : ''}
        {proyecto.grupo ? `, grupo ${proyecto.grupo}` : ''}, período{' '}
        {proyecto.periodo}, quedó en estado «{proyecto.estado?.nombre}».
        {proyecto.docentes.length > 0 && (
          <>
            {' '}
            Ya aparece en la bandeja de{' '}
            {proyecto.docentes.map(nombreDocente).join(', ')}.
          </>
        )}
      </p>
      {proyecto.informacionIncompleta && (
        <Advertencia titulo="Quedó marcado con información incompleta">
          <p>
            A la asignatura le faltan:{' '}
            {proyecto.informacion.camposFaltantes.join(', ')}.
          </p>
        </Advertencia>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/proyectos-docentes/${proyecto.id}`}
          className={`${claseBotonPrincipal} text-center`}
        >
          Ver el proyecto
        </Link>
        <Link
          href="/proyectos-docentes"
          className={`${claseBotonSecundario} text-center`}
        >
          Ir a la bandeja
        </Link>
      </div>
    </section>
  );
}
