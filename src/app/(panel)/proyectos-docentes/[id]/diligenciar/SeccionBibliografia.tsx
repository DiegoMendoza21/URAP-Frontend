'use client';

import { useId, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  consultarBibliografia,
  consultarProyectosParaImportar,
  guardarBibliografia,
  type ProyectoConBibliografia,
} from '@/api/diligenciamiento';
import { AvisoError, Cargando, Insignia } from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import { BotonSecundario } from './Controles';
import type { PropiedadesSeccion } from './DiligenciamientoProyecto';
import { type AccionesLista, EditorLista } from './EditorLista';

/** Mismos límites que valida el backend (GuardarBibliografiaDto). */
const REFERENCIA_MAXIMO = 2000;
const REFERENCIAS_MAXIMO = 100;

/**
 * Punto 7 «Bibliografía» (RF-16, HU-06-07): listado numerado en texto libre, sin imponer una
 * norma de citación. Se puede reutilizar la bibliografía de otro proyecto docente (p2).
 */
export function SeccionBibliografia({
  idProyecto,
  puedeEditar,
  alGuardar,
  alCambiar,
}: PropiedadesSeccion) {
  const consulta = useConsulta(`bibliografia-${idProyecto}`, (senal) =>
    consultarBibliografia(idProyecto, senal),
  );

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

  return (
    <div className="space-y-4">
      {puedeEditar && (
        <p className="text-sm text-slate-600">
          Escriba cada referencia como la citaría en el documento. El número es
          su posición en el listado.
        </p>
      )}
      <EditorLista
        guardadoInicial={consulta.datos.referencias.map((r) => r.referencia)}
        puedeEditar={puedeEditar}
        maximoTexto={REFERENCIA_MAXIMO}
        maximoElementos={REFERENCIAS_MAXIMO}
        rotulos={{
          elemento: 'referencia',
          guardar: 'Guardar bibliografía',
          vacio: 'El docente todavía no ha registrado la bibliografía.',
          ayuda: 'Autor, año, título y demás datos, en la norma que prefiera.',
        }}
        guardar={async (textos) =>
          (await guardarBibliografia(idProyecto, textos)).referencias.map(
            (r) => r.referencia,
          )
        }
        alGuardar={alGuardar}
        alCambiar={alCambiar}
        complemento={(acciones) => (
          <ImportarBibliografia idProyecto={idProyecto} acciones={acciones} />
        )}
      />
    </div>
  );
}

/** Agrega al listado las referencias de otro proyecto docente del usuario (RF-16, p2). */
function ImportarBibliografia({
  idProyecto,
  acciones,
}: {
  idProyecto: number;
  acciones: AccionesLista;
}) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState<number | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const proyectos = useConsulta<ProyectoConBibliografia[]>(
    abierto ? `importar-bibliografia-${idProyecto}` : null,
    (senal) => consultarProyectosParaImportar(idProyecto, senal),
  );

  async function importar() {
    if (elegido === null || importando) {
      return;
    }
    setImportando(true);
    setError(null);
    setResultado(null);
    try {
      const origen = await consultarBibliografia(elegido);
      const textos = origen.referencias.map((r) => r.referencia);
      const agregadas = acciones.agregar(textos);
      const omitidas = textos.length - agregadas;
      setResultado(
        agregadas === 0
          ? 'Todas sus referencias ya estaban en el listado.'
          : `Se agregaron ${agregadas} ${agregadas === 1 ? 'referencia' : 'referencias'}` +
              (omitidas > 0 ? ` (${omitidas} ya estaban o no cabían)` : '') +
              '. Revise el listado y guárdelo.',
      );
    } catch (falla) {
      setError(mensajeParaUsuario(falla));
    } finally {
      setImportando(false);
    }
  }

  if (!abierto) {
    return (
      <BotonSecundario onClick={() => setAbierto(true)}>
        Importar de otro proyecto docente
      </BotonSecundario>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3 sm:p-4">
      <legend className="px-1 text-sm font-semibold">
        Importar de otro proyecto docente
      </legend>
      {(proyectos.estado === 'cargando' || proyectos.estado === 'inactiva') && (
        <Cargando />
      )}
      {proyectos.estado === 'fallida' && (
        <AvisoError
          mensaje={proyectos.mensaje}
          reintentar={proyectos.reintentable ? proyectos.reintentar : undefined}
        />
      )}
      {proyectos.estado === 'lista' &&
        (proyectos.datos.length === 0 ? (
          <p className="text-sm text-slate-600">
            No tiene otros proyectos docentes con bibliografía registrada.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Elija el proyecto. Sus referencias se agregan al final del listado
              y las repetidas se omiten.
            </p>
            <ul className="space-y-2">
              {proyectos.datos.map((proyecto) => (
                <li key={proyecto.id}>
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <input
                      type="radio"
                      name={`${id}-origen`}
                      checked={elegido === proyecto.id}
                      onChange={() => setElegido(proyecto.id)}
                      className="mt-1 size-5 shrink-0 accent-marca"
                    />
                    <span className="space-y-1">
                      <span className="block font-medium">
                        {proyecto.asignatura}
                      </span>
                      <span className="flex flex-wrap gap-1.5 text-sm text-slate-600">
                        {proyecto.periodo && (
                          <span>Período {proyecto.periodo}</span>
                        )}
                        {proyecto.grupo && (
                          <span>· Grupo {proyecto.grupo}</span>
                        )}
                        <span>
                          · {proyecto.referencias}{' '}
                          {proyecto.referencias === 1
                            ? 'referencia'
                            : 'referencias'}
                        </span>
                      </span>
                      {proyecto.mismaAsignatura && (
                        <Insignia tono="marca">Misma asignatura</Insignia>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <BotonSecundario
                onClick={() => void importar()}
                disabled={elegido === null || importando}
              >
                {importando ? 'Importando…' : 'Agregar sus referencias'}
              </BotonSecundario>
              <BotonSecundario
                onClick={() => {
                  setAbierto(false);
                  setResultado(null);
                  setError(null);
                }}
              >
                Cerrar
              </BotonSecundario>
            </div>
          </>
        ))}
      {resultado && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {resultado}
        </p>
      )}
      {error && <AvisoError mensaje={error} />}
    </fieldset>
  );
}
