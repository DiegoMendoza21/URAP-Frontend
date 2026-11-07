'use client';

import { useEffect, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  actualizarRac,
  cambioRechazado,
  consultarRac,
  crearRac,
  type DatosGuardarRac,
  eliminarRac,
  nombreRap,
  type Rac,
  type SeccionRac as DatosSeccionRac,
} from '@/api/diligenciamiento';
import { AvisoError, Cargando, Insignia } from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { BotonSecundario } from './Controles';
import { FormularioRac } from './FormularioRac';

/** Qué formulario está abierto y en qué grupo se muestra. */
type Edicion =
  | { modo: 'nuevo'; idRap: number }
  | { modo: 'editar'; idRap: number; rac: Rac }
  | null;

/**
 * Punto 3 «Resultados de aprendizaje del curso» (RF-12): un bloque por cada RAP del proyecto
 * con su enunciado completo (p2) y los RAC que contribuyen a él (p3). Señala los RAP que
 * todavía no tienen RAC (p5). Cada RAC se guarda por separado (HU-06-08).
 */
export function SeccionRac({
  idProyecto,
  puedeEditar,
  alGuardar,
  alCambiar,
}: {
  idProyecto: number;
  puedeEditar: boolean;
  alGuardar: () => void;
  alCambiar: (hayCambios: boolean) => void;
}) {
  const consulta = useConsulta(`rac-${idProyecto}`, (senal) =>
    consultarRac(idProyecto, senal),
  );
  const [actual, setActual] = useState<DatosSeccionRac | null>(null);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [porEliminar, setPorEliminar] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Un formulario cerrado no deja cambios pendientes.
  useEffect(() => {
    if (edicion === null) {
      alCambiar(false);
    }
  }, [alCambiar, edicion]);

  if (consulta.estado === 'cargando' || consulta.estado === 'inactiva') {
    return <Cargando />;
  }
  if (consulta.estado === 'fallida') {
    return (
      <AvisoError
        mensaje={consulta.mensaje}
        reintentar={consulta.reintentable ? consulta.reintentar : undefined}
      />
    );
  }
  const seccion = actual ?? consulta.datos;
  const sinRac = new Set(seccion.rapsSinRac);

  async function guardar(datos: DatosGuardarRac): Promise<string | null> {
    try {
      const respuesta =
        edicion?.modo === 'editar'
          ? await actualizarRac(idProyecto, edicion.rac.id, datos)
          : await crearRac(idProyecto, datos);
      setActual(respuesta);
      setEdicion(null);
      setAviso(`${datos.codigo} guardado.`);
      alGuardar();
      return null;
    } catch (falla) {
      if (cambioRechazado(falla)) {
        alGuardar();
      }
      return mensajeParaUsuario(falla);
    }
  }

  async function confirmarEliminacion(rac: Rac) {
    setError(null);
    try {
      setActual(await eliminarRac(idProyecto, rac.id));
      setPorEliminar(null);
      setAviso(`${rac.codigo} eliminado.`);
      alGuardar();
    } catch (falla) {
      setError(mensajeParaUsuario(falla));
      if (cambioRechazado(falla)) {
        alGuardar();
      }
    }
  }

  const formulario = (idRap: number) =>
    edicion && edicion.idRap === idRap ? (
      <FormularioRac
        key={edicion.modo === 'editar' ? `e-${edicion.rac.id}` : `n-${idRap}`}
        grupos={seccion.grupos}
        rac={edicion.modo === 'editar' ? edicion.rac : undefined}
        idRapInicial={idRap}
        guardar={guardar}
        cancelar={() => setEdicion(null)}
        alCambiar={alCambiar}
      />
    ) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Registre los RAC del curso bajo cada RAP del programa al que
        contribuyen. Un mismo RAC puede contribuir a varios RAP.
      </p>
      {seccion.rapsSinRac.length > 0 && (
        <p role="status" className="text-sm font-medium text-amber-900">
          {seccion.rapsSinRac.length === 1
            ? 'Falta 1 RAP por cubrir con RAC.'
            : `Faltan ${seccion.rapsSinRac.length} RAP por cubrir con RAC.`}
        </p>
      )}
      {aviso && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {aviso}
        </p>
      )}
      {error && <AvisoError mensaje={error} />}

      <ul className="space-y-4">
        {seccion.grupos.map(({ rap, racs }) => (
          <li
            key={rap.id}
            className="space-y-3 rounded-xl border border-slate-200 p-3 sm:p-4"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{nombreRap(rap)}</h3>
                {sinRac.has(rap.id) && (
                  <Insignia tono="advertencia">Sin RAC</Insignia>
                )}
              </div>
              {rap.descripcion && (
                <p className="text-sm text-slate-700">{rap.descripcion}</p>
              )}
            </div>

            {racs.length > 0 && (
              <ul className="space-y-2">
                {racs.map((rac) =>
                  edicion?.modo === 'editar' &&
                  edicion.rac.id === rac.id &&
                  edicion.idRap === rap.id ? (
                    <li key={rac.id}>{formulario(rap.id)}</li>
                  ) : (
                    <li
                      key={rac.id}
                      className="space-y-2 rounded-lg bg-slate-50 p-3"
                    >
                      <p>
                        <span className="font-semibold">{rac.codigo}.</span>{' '}
                        {rac.enunciado}
                      </p>
                      {rac.raps
                        .filter((r) => r.idRap === rap.id)
                        .map(
                          (r) =>
                            r.descripcionContribucion && (
                              <p
                                key={r.idRap}
                                className="text-sm text-slate-600"
                              >
                                Contribución: {r.descripcionContribucion}
                              </p>
                            ),
                        )}
                      {rac.raps.length > 1 && (
                        <p className="text-sm text-slate-600">
                          También contribuye a{' '}
                          {rac.raps
                            .filter((r) => r.idRap !== rap.id)
                            .map(nombreRap)
                            .join(', ')}
                          .
                        </p>
                      )}
                      {puedeEditar &&
                        (porEliminar === rac.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              ¿Eliminar {rac.codigo} de todos sus RAP?
                            </span>
                            <BotonSecundario
                              peligro
                              onClick={() => void confirmarEliminacion(rac)}
                            >
                              Sí, eliminar
                            </BotonSecundario>
                            <BotonSecundario
                              onClick={() => setPorEliminar(null)}
                            >
                              No
                            </BotonSecundario>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <BotonSecundario
                              onClick={() => {
                                setAviso(null);
                                setEdicion({
                                  modo: 'editar',
                                  idRap: rap.id,
                                  rac,
                                });
                              }}
                              disabled={edicion !== null}
                            >
                              Editar
                            </BotonSecundario>
                            <BotonSecundario
                              peligro
                              onClick={() => setPorEliminar(rac.id)}
                              disabled={edicion !== null}
                            >
                              Eliminar
                            </BotonSecundario>
                          </div>
                        ))}
                    </li>
                  ),
                )}
              </ul>
            )}
            {racs.length === 0 && !puedeEditar && (
              <p className="text-sm text-slate-600">Sin RAC registrados.</p>
            )}

            {edicion?.modo === 'nuevo' && edicion.idRap === rap.id
              ? formulario(rap.id)
              : puedeEditar && (
                  <BotonSecundario
                    onClick={() => {
                      setAviso(null);
                      setEdicion({ modo: 'nuevo', idRap: rap.id });
                    }}
                    disabled={edicion !== null}
                  >
                    + Agregar RAC a {nombreRap(rap)}
                  </BotonSecundario>
                )}
          </li>
        ))}
      </ul>
    </div>
  );
}
