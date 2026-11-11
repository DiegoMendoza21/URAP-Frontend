'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  type ComponentType,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  consultarDiligenciamiento,
  type Diligenciamiento,
} from '@/api/diligenciamiento';
import { consultarProyectoDocente } from '@/api/proyectos-docentes';
import { porcentaje } from '@/componentes/formato';
import {
  consultarObservaciones,
  type Observacion,
  type ObservacionesProyecto,
} from '@/api/revision';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../_componentes/Estados';
import { momento } from '../../_componentes/fechas';
import { useConsulta } from '../../_componentes/useConsulta';
import { ObservacionesSeccion } from './ObservacionesSeccion';
import {
  ESTADOS_SECCION,
  ORDEN_ESTADOS_SECCION,
  tituloEstadoSeccion,
} from './estadosSeccion';
import { PanelEnvio } from './PanelEnvio';
import { SeccionBibliografia } from './SeccionBibliografia';
import { SeccionContenidos } from './SeccionContenidos';
import { SeccionDescripcion } from './SeccionDescripcion';
import { SeccionEstrategias } from './SeccionEstrategias';
import { SeccionEvaluacion } from './SeccionEvaluacion';
import { SeccionRac } from './SeccionRac';
import { useAvisoSalida } from './useAvisoSalida';

const MENSAJE_SALIDA =
  'Tiene cambios sin guardar. Si sale ahora, se perderán. ¿Desea salir?';

/** Espacio que se deja a la izquierda de la pestaña activa al desplazarla (el `px-4` de la tira). */
const DESPLAZAMIENTO_MARGEN = 16;

export interface PropiedadesSeccion {
  idProyecto: number;
  puedeEditar: boolean;
  /**
   * Si la pestaña de la sección está a la vista. Las secciones quedan montadas al cambiar de
   * pestaña, así que la que depende de otra (el punto 5 de los RAC del punto 3) lo usa para
   * consultar de nuevo al volver a mostrarse.
   */
  visible?: boolean;
  /** Pide el resumen otra vez: tras guardar, o si el servidor rechazó el cambio. */
  alGuardar: () => void;
  /** Avisa si la sección tiene cambios sin guardar. */
  alCambiar: (hayCambios: boolean) => void;
}

/** Estados desde los que el docente envía a revisión (RF-17, precondición). */
const ESTADOS_QUE_SE_ENVIAN = ['en_diligenciamiento', 'devuelto'];

/**
 * Pantalla de cada sección (puntos 2 a 7), por la clave que le da el backend. La revisión del
 * departamento (RF-18) las reutiliza en solo lectura.
 */
export const PANTALLAS: Record<string, ComponentType<PropiedadesSeccion>> = {
  descripcion: SeccionDescripcion,
  rac: SeccionRac,
  estrategias: SeccionEstrategias,
  evaluacion: SeccionEvaluacion,
  contenidos: SeccionContenidos,
  bibliografia: SeccionBibliografia,
};

/**
 * Diligenciamiento del proyecto docente por secciones, con la numeración del formato
 * FO-DO/PC-001. Cada sección se guarda por separado y se puede pasar de una a otra sin
 * completarla (HU-06-08): las secciones quedan montadas, así un borrador no se pierde al
 * cambiar de pestaña.
 */
export function DiligenciamientoProyecto() {
  const { id } = useParams<{ id: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;
  const proyecto = useConsulta(
    idProyecto === null ? null : `proyecto-${idProyecto}`,
    (senal) => consultarProyectoDocente(idProyecto!, senal),
  );
  const consulta = useConsulta(
    idProyecto === null ? null : `diligenciamiento-${idProyecto}`,
    (senal) => consultarDiligenciamiento(idProyecto!, senal),
  );
  const observaciones = useConsulta(
    idProyecto === null ? null : `observaciones-${idProyecto}`,
    (senal) => consultarObservaciones(idProyecto!, senal),
  );
  const [refrescado, setRefrescado] = useState<Diligenciamiento | null>(null);
  const [observacionesActuales, setObservacionesActuales] =
    useState<ObservacionesProyecto | null>(null);
  const [activa, setActiva] = useState<string | null>(null);
  /** Sube con cada sección guardada u observación marcada: el panel de envío vuelve a verificar. */
  const [cambiosGuardados, setCambiosGuardados] = useState(0);
  const [conCambios, setConCambios] = useState<ReadonlySet<string>>(new Set());
  const ultimaConsulta = useRef(0);
  useAvisoSalida(conCambios.size > 0);

  // Tras guardar una sección se actualiza el resumen sin volver a mostrar «Cargando…». Si
  // dos guardados seguidos responden en otro orden, solo cuenta la última consulta.
  const alGuardar = useCallback(() => {
    if (idProyecto === null) {
      return;
    }
    const numero = ++ultimaConsulta.current;
    consultarDiligenciamiento(idProyecto).then(
      (datos) => {
        if (numero === ultimaConsulta.current) {
          setRefrescado(datos);
          setCambiosGuardados((valor) => valor + 1);
        }
      },
      () => {
        // Si falla, el resumen anterior sigue en pantalla; lo guardado no se pierde.
      },
    );
  }, [idProyecto]);

  // HU-07-05: tras marcar una observación o enviar, se actualizan sin «Cargando…».
  const recargarObservaciones = useCallback(() => {
    if (idProyecto === null) {
      return;
    }
    consultarObservaciones(idProyecto).then(setObservacionesActuales, () => {
      // Si falla, quedan las anteriores en pantalla.
    });
  }, [idProyecto]);

  const alMarcar = useCallback(
    (marcada: Observacion) => {
      setCambiosGuardados((valor) => valor + 1);
      setObservacionesActuales((previas) => {
        const base =
          previas ??
          (observaciones.estado === 'lista' ? observaciones.datos : null);
        if (!base?.devolucion) {
          return base;
        }
        const lista = base.devolucion.observaciones.map((observacion) =>
          observacion.id === marcada.id ? marcada : observacion,
        );
        return {
          ...base,
          devolucion: {
            ...base.devolucion,
            observaciones: lista,
            sinResolver: lista.filter((observacion) => !observacion.resuelta)
              .length,
          },
        };
      });
    },
    [observaciones],
  );

  const cambiosDe = useCallback(
    (clave: string) => (hayCambios: boolean) =>
      setConCambios((previas) => {
        if (previas.has(clave) === hayCambios) {
          return previas;
        }
        const siguientes = new Set(previas);
        if (hayCambios) {
          siguientes.add(clave);
        } else {
          siguientes.delete(clave);
        }
        return siguientes;
      }),
    [],
  );

  // En el teléfono las pestañas no caben a lo ancho. Al cambiar de sección, también sin tocar la
  // pestaña (por ejemplo, desde «Ir al punto N»), la activa se desplaza a la vista dentro de su
  // tira, sin mover la página.
  useEffect(() => {
    if (activa === null) {
      return;
    }
    const pestana = document.querySelector<HTMLElement>(
      'nav[aria-label="Secciones del proyecto docente"] [aria-current="step"]',
    );
    const tira = pestana?.closest('ol');
    if (!pestana || !tira) {
      return;
    }
    const visible = tira.getBoundingClientRect();
    const caja = pestana.getBoundingClientRect();
    if (caja.left < visible.left || caja.right > visible.right) {
      tira.scrollBy({
        left: caja.left - visible.left - DESPLAZAMIENTO_MARGEN,
        behavior: 'smooth',
      });
    }
  }, [activa]);

  const resumen =
    refrescado ?? (consulta.estado === 'lista' ? consulta.datos : null);
  const claveActiva = activa ?? resumen?.secciones[0]?.clave ?? null;
  const datosObservaciones =
    observacionesActuales ??
    (observaciones.estado === 'lista' ? observaciones.datos : null);
  // Las observaciones se muestran mientras el proyecto está devuelto: después del reenvío
  // quedan en el historial de la ficha.
  const devolucion = datosObservaciones?.vigentes
    ? datosObservaciones.devolucion
    : null;
  const observacionesDe = (clave: string) =>
    devolucion?.observaciones.filter(
      (observacion) => observacion.seccion === clave,
    ) ?? [];
  const puedeEnviar =
    resumen !== null &&
    resumen.puedeEditar &&
    ESTADOS_QUE_SE_ENVIAN.includes(resumen.estado?.codigo ?? '');

  const irASeccion = (clave: string) => {
    setActiva(clave);
    document
      .getElementById('secciones-proyecto')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="space-y-5">
      <Link
        href={
          idProyecto === null
            ? '/proyectos-docentes'
            : `/proyectos-docentes/${idProyecto}`
        }
        onClick={(evento) => {
          if (conCambios.size > 0 && !window.confirm(MENSAJE_SALIDA)) {
            evento.preventDefault();
          }
        }}
        className="text-sm font-medium text-marca hover:underline"
      >
        ← Ficha del proyecto
      </Link>

      {idProyecto === null && (
        <AvisoError mensaje="El proyecto docente no existe o no tiene acceso a él." />
      )}
      {consulta.estado === 'cargando' && <Cargando />}
      {consulta.estado === 'fallida' && (
        <AvisoError
          mensaje={consulta.mensaje}
          reintentar={consulta.reintentable ? consulta.reintentar : undefined}
        />
      )}

      {resumen && idProyecto !== null && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">
              Diligenciamiento del proyecto docente
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {proyecto.estado === 'lista'
                ? proyecto.datos.asignatura
                : 'Proyecto docente'}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {resumen.estado && (
                <Insignia tono="marca">{resumen.estado.nombre}</Insignia>
              )}
              {proyecto.estado === 'lista' && proyecto.datos.periodo && (
                <Insignia>Período {proyecto.datos.periodo}</Insignia>
              )}
            </div>
          </div>

          {devolucion && (
            <Advertencia titulo="El departamento académico devolvió el proyecto con observaciones">
              <p>
                Cada observación aparece en su sección. Corrija, márquela como
                resuelta y vuelva a enviarlo a revisión.
              </p>
              {/* La hora termina en «a. m.» o «p. m.»: va sin punto final. */}
              {devolucion.fecha && (
                <p className="text-sm">
                  Devuelto el {momento(devolucion.fecha)}
                </p>
              )}
              {devolucion.observacionGeneral && (
                <p className="italic">«{devolucion.observacionGeneral}»</p>
              )}
            </Advertencia>
          )}

          {resumen.motivoNoEditable && (
            <Advertencia titulo="Solo lectura">
              <p>{resumen.motivoNoEditable}</p>
            </Advertencia>
          )}

          <ResumenSecciones resumen={resumen} />

          <nav
            id="secciones-proyecto"
            aria-label="Secciones del proyecto docente"
            className="scroll-mt-4"
          >
            {/* `relative`: los textos `sr-only` de cada pestaña son `absolute`; sin un contenedor
                posicionado escapan del desplazamiento horizontal y ensanchan la página en el teléfono. */}
            <ol className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {resumen.secciones.map((seccion) => {
                const actual = seccion.clave === claveActiva;
                const sinResolver = observacionesDe(seccion.clave).filter(
                  (observacion) => !observacion.resuelta,
                ).length;
                return (
                  <li key={seccion.clave} className="shrink-0">
                    <button
                      type="button"
                      aria-current={actual ? 'step' : undefined}
                      onClick={() => setActiva(seccion.clave)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${
                        actual
                          ? 'border-marca bg-marca text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span>
                        {seccion.numero}. {seccion.titulo}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`inline-block size-2.5 rounded-full ${
                          ESTADOS_SECCION[seccion.estado].punto
                        }`}
                      />
                      <span className="sr-only">
                        ({ESTADOS_SECCION[seccion.estado].texto})
                      </span>
                      {sinResolver > 0 && (
                        <span
                          className={`rounded-full px-1.5 text-xs ${
                            actual
                              ? 'bg-white text-marca'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {sinResolver}
                          <span className="sr-only">
                            {sinResolver === 1
                              ? ' observación sin resolver'
                              : ' observaciones sin resolver'}
                          </span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {resumen.secciones.map((seccion) => {
            const Pantalla = PANTALLAS[seccion.clave];
            return (
              <section
                key={seccion.clave}
                hidden={seccion.clave !== claveActiva}
                aria-labelledby={`titulo-${seccion.clave}`}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="space-y-1">
                  <h2
                    id={`titulo-${seccion.clave}`}
                    className="text-lg font-semibold"
                  >
                    {seccion.numero}. {seccion.titulo}
                  </h2>
                  {seccion.pendientes.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-amber-900">
                      {seccion.pendientes.map((pendiente) => (
                        <li key={pendiente}>{pendiente}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-emerald-700">
                      Sección completa.
                    </p>
                  )}
                </div>
                <ObservacionesSeccion
                  idProyecto={idProyecto}
                  observaciones={observacionesDe(seccion.clave)}
                  puedeMarcar={resumen.puedeEditar}
                  alMarcar={alMarcar}
                />
                {Pantalla ? (
                  <Pantalla
                    idProyecto={idProyecto}
                    puedeEditar={resumen.puedeEditar}
                    visible={seccion.clave === claveActiva}
                    alGuardar={alGuardar}
                    alCambiar={cambiosDe(seccion.clave)}
                  />
                ) : (
                  <p className="text-sm text-slate-600">
                    Esta sección todavía no está disponible.
                  </p>
                )}
              </section>
            );
          })}

          {puedeEnviar && (
            <PanelEnvio
              idProyecto={idProyecto}
              cambiosGuardados={cambiosGuardados}
              alEnviar={() => {
                alGuardar();
                recargarObservaciones();
              }}
              irASeccion={irASeccion}
            />
          )}
        </>
      )}
    </section>
  );
}

/**
 * HU-06-09: cuántas secciones están completas, con la misma cuenta del tablero de seguimiento,
 * y qué significa cada color de las pestañas. Se actualiza al guardar, porque el resumen se
 * vuelve a pedir en cada guardado.
 */
function ResumenSecciones({ resumen }: { resumen: Diligenciamiento }) {
  const { completas, total } = resumen.completitud;
  return (
    <div className="space-y-1">
      <p role="status" className="text-sm font-medium text-slate-800">
        Secciones completas: {completas} de {total} (
        {porcentaje(resumen.completitud.porcentaje)})
      </p>
      <ul
        aria-label="Qué significa cada color"
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"
      >
        {ORDEN_ESTADOS_SECCION.map((estado) => (
          <li key={estado} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block size-2.5 rounded-full ${ESTADOS_SECCION[estado].punto}`}
            />
            {tituloEstadoSeccion(estado)}
          </li>
        ))}
      </ul>
    </div>
  );
}
