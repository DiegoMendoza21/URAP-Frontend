'use client';

import { useId, useState } from 'react';
import {
  consultarEstrategias,
  guardarEstrategias,
  type SeccionEstrategias as DatosSeccionEstrategias,
} from '@/api/diligenciamiento';
import { AvisoError, Cargando } from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import type { PropiedadesSeccion } from './DiligenciamientoProyecto';
import { type AccionesLista, claveTexto, EditorLista } from './EditorLista';

/** Mismos límites que valida el backend (GuardarEstrategiasDto). */
const ESTRATEGIA_MAXIMO = 1000;
const ESTRATEGIAS_MAXIMO = 50;

/** Lo que el servidor sugiere agregar: el catálogo del MEN y lo que usa el programa. */
type Sugerencias = Pick<DatosSeccionEstrategias, 'catalogo' | 'sugeridas'>;

interface GrupoSugerencias {
  titulo: string;
  descripcion: string;
  textos: string[];
  /** Qué se dice si el servidor no trae ninguna en este grupo. */
  sinSugerencias: string;
}

/**
 * Los tres grupos de RF-13, p2, en el orden en que el servidor los depura: una estrategia que
 * ya salió en un grupo no vuelve a salir en el siguiente.
 */
function gruposDe({ catalogo, sugeridas }: Sugerencias): GrupoSugerencias[] {
  return [
    {
      titulo: 'Estrategias de enseñanza (MEN)',
      descripcion: 'Las propone y conduce el docente.',
      textos: catalogo.ensenanza,
      sinSugerencias: 'No quedan estrategias de este grupo por agregar.',
    },
    {
      titulo: 'Estrategias de aprendizaje (MEN)',
      descripcion: 'Las ejecuta el estudiante.',
      textos: catalogo.aprendizaje,
      sinSugerencias: 'No quedan estrategias de este grupo por agregar.',
    },
    {
      titulo: 'Usadas en otros proyectos del programa',
      descripcion:
        'No son un catálogo oficial: las registraron otros proyectos docentes del programa.',
      textos: sugeridas,
      sinSugerencias:
        'Todavía no hay: aparecerán cuando otros proyectos docentes del programa registren estrategias distintas de las del MEN.',
    },
  ];
}

/**
 * Punto 4 «Estrategias metodológicas» (RF-13, HU-06-04): listado que el docente redacta o
 * arma con las sugerencias, y que puede reordenar y depurar. Las sugerencias son el catálogo
 * del Ministerio de Educación Nacional (MEN), de enseñanza y de aprendizaje, y las que ya
 * registraron otros proyectos del programa (solo el texto, sin el proyecto ni el docente).
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
  const [sugerencias, setSugerencias] = useState<Sugerencias | null>(null);

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
  const grupos = gruposDe(sugerencias ?? consulta.datos);

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
          ayuda:
            'Redáctela con sus palabras o tome una de las sugerencias de abajo.',
        }}
        guardar={async (textos) => {
          const respuesta = await guardarEstrategias(idProyecto, textos);
          setSugerencias({
            catalogo: respuesta.catalogo,
            sugeridas: respuesta.sugeridas,
          });
          return respuesta.estrategias.map((e) => e.descripcion);
        }}
        alGuardar={alGuardar}
        alCambiar={alCambiar}
        complemento={(acciones) => (
          <SugerenciasEstrategias grupos={grupos} {...acciones} />
        )}
      />
    </div>
  );
}

/**
 * Las sugerencias por grupo. Cada una se agrega al listado con un toque, y las que ya están en
 * el listado, guardado o no, dejan de mostrarse.
 */
function SugerenciasEstrategias({
  grupos,
  textos,
  agregar,
}: { grupos: GrupoSugerencias[] } & AccionesLista) {
  const id = useId();
  const enElListado = new Set(textos.map(claveTexto));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Sugerencias</p>
        <p className="text-sm text-slate-600">
          Toque una para agregarla al listado.
        </p>
      </div>
      {grupos.map((grupo, indice) => {
        const disponibles = grupo.textos.filter(
          (texto) => !enElListado.has(claveTexto(texto)),
        );
        const idTitulo = `${id}-grupo-${indice}`;
        return (
          <div
            key={grupo.titulo}
            role="group"
            aria-labelledby={idTitulo}
            className="space-y-2"
          >
            <div>
              <h3 id={idTitulo} className="text-sm font-semibold">
                {grupo.titulo}
              </h3>
              <p className="text-sm text-slate-600">{grupo.descripcion}</p>
            </div>
            {disponibles.length > 0 ? (
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
            ) : (
              <p className="text-sm text-slate-600">
                {grupo.textos.length > 0
                  ? 'Ya agregó todas las de este grupo.'
                  : grupo.sinSugerencias}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
