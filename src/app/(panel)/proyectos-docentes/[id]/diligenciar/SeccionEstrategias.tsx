'use client';

import { useState } from 'react';
import {
  consultarEstrategias,
  guardarEstrategias,
} from '@/api/diligenciamiento';
import { AvisoError, Cargando } from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import type { PropiedadesSeccion } from './DiligenciamientoProyecto';
import { claveTexto, EditorLista } from './EditorLista';

/** Mismos límites que valida el backend (GuardarEstrategiasDto). */
const ESTRATEGIA_MAXIMO = 1000;
const ESTRATEGIAS_MAXIMO = 50;

/**
 * Punto 4 «Estrategias metodológicas» (RF-13, HU-06-04): listado que el docente redacta o
 * arma con el catálogo sugerido, y que puede reordenar y depurar antes de guardarlo.
 */
export function SeccionEstrategias({
  idProyecto,
  puedeEditar,
  alGuardar,
  alCambiar,
}: PropiedadesSeccion) {
  const consulta = useConsulta(`estrategias-${idProyecto}`, (senal) =>
    consultarEstrategias(idProyecto, senal),
  );
  const [sugeridas, setSugeridas] = useState<string[] | null>(null);

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
  const catalogo = sugeridas ?? consulta.datos.sugeridas;

  return (
    <div className="space-y-4">
      {puedeEditar && (
        <p className="text-sm text-slate-600">
          Liste las estrategias de enseñanza y de aprendizaje del curso, en el
          orden en que quiere presentarlas.
        </p>
      )}
      <EditorLista
        guardadoInicial={consulta.datos.estrategias.map((e) => e.descripcion)}
        puedeEditar={puedeEditar}
        maximoTexto={ESTRATEGIA_MAXIMO}
        maximoElementos={ESTRATEGIAS_MAXIMO}
        rotulos={{
          elemento: 'estrategia',
          guardar: 'Guardar estrategias',
          vacio:
            'El docente todavía no ha registrado estrategias metodológicas.',
          ayuda: 'Redáctela con sus palabras o elíjala del catálogo sugerido.',
        }}
        guardar={async (textos) => {
          const respuesta = await guardarEstrategias(idProyecto, textos);
          setSugeridas(respuesta.sugeridas);
          return respuesta.estrategias.map((e) => e.descripcion);
        }}
        alGuardar={alGuardar}
        alCambiar={alCambiar}
        complemento={({ textos, agregar }) => {
          const usadas = new Set(textos.map(claveTexto));
          const disponibles = catalogo.filter(
            (texto) => !usadas.has(claveTexto(texto)),
          );
          return (
            <div className="space-y-2">
              <p className="text-sm font-medium">Catálogo sugerido</p>
              {disponibles.length > 0 ? (
                <>
                  <p className="text-sm text-slate-600">
                    Estrategias que usan otros proyectos docentes del programa.
                    Toque una para agregarla al listado.
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {disponibles.map((texto) => (
                      <li key={texto}>
                        <button
                          type="button"
                          onClick={() => agregar([texto])}
                          className="rounded-full border border-marca/40 bg-marca/5 px-3 py-2 text-left text-sm font-medium text-marca hover:bg-marca/10"
                        >
                          + {texto}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  {catalogo.length > 0
                    ? 'Ya agregó todas las estrategias del catálogo.'
                    : 'Todavía no hay estrategias sugeridas: el catálogo se arma con las que registran los proyectos docentes del programa.'}
                </p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
