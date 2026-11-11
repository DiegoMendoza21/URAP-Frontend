'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  consultarParametros,
  type Parametro,
  PERMISO_PARAMETROS,
} from '@/api/parametros';
import { usePermisos } from '@/sesion/permisos';
import {
  AvisoError,
  Cargando,
} from '../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../proyectos-docentes/_componentes/useConsulta';
import { TarjetaParametro } from './TarjetaParametro';
import { agrupar } from './textos';

/**
 * Parámetros del sistema (HU-03-07): los valores con que el administrador ajusta el
 * comportamiento del sistema sin cambiar el código, agrupados por tema. El backend decide
 * quién entra (el permiso de administrar la estructura académica), qué parámetros hay y qué
 * valores admite cada uno; el secreto y la vigencia de la sesión no están aquí porque no son
 * parámetros editables (NFR-003).
 */
export function ParametrosSistema() {
  const tiene = usePermisos();
  const puedeAdministrar = tiene(PERMISO_PARAMETROS);
  // Sin el permiso no se consulta: el backend respondería 403.
  const consulta = useConsulta(
    puedeAdministrar ? 'parametros' : null,
    consultarParametros,
  );
  /** Los parámetros ya guardados en esta visita, por clave: reemplazan a los de la consulta. */
  const [guardados, setGuardados] = useState<Record<string, Parametro>>({});

  return (
    <section aria-labelledby="titulo-parametros" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Inicio
        </Link>
        <h1 id="titulo-parametros" className="text-2xl font-bold sm:text-3xl">
          Parámetros del sistema
        </h1>
        <p className="text-slate-700">
          Ajuste aquí las reglas y los límites del sistema. Cada cambio rige de
          inmediato y queda en el registro de auditoría con el valor anterior y
          el nuevo.
        </p>
      </div>

      {!puedeAdministrar && (
        <AvisoError mensaje="Sus roles no tienen permiso para configurar los parámetros del sistema." />
      )}
      {consulta.estado === 'cargando' && <Cargando />}
      {consulta.estado === 'fallida' && (
        <AvisoError
          mensaje={consulta.mensaje}
          reintentar={consulta.reintentable ? consulta.reintentar : undefined}
        />
      )}

      {consulta.estado === 'lista' &&
        agrupar(
          consulta.datos.map(
            (parametro) => guardados[parametro.clave] ?? parametro,
          ),
        ).map((grupo) => (
          <section
            key={grupo.titulo}
            aria-label={grupo.titulo}
            className="space-y-3"
          >
            <h2 className="text-xl font-semibold">{grupo.titulo}</h2>
            {grupo.parametros.map(({ parametro, texto }) => (
              <TarjetaParametro
                key={parametro.clave}
                parametro={parametro}
                texto={texto}
                alGuardar={(guardado) =>
                  setGuardados((previos) => ({
                    ...previos,
                    [guardado.clave]: guardado,
                  }))
                }
              />
            ))}
          </section>
        ))}
    </section>
  );
}
