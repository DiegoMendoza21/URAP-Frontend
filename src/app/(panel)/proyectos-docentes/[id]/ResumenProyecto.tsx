'use client';

import Link from 'next/link';
import {
  consultarDiligenciamiento,
  consultarRac,
} from '@/api/diligenciamiento';
import { consultarOpcionesEvidencias } from '@/api/evidencias';
import { consultarMedicionesDelProyecto } from '@/api/mediciones';
import type { ProyectoDocenteDetalle } from '@/api/proyectos-docentes';
import { consultarCalendario } from '@/api/sesiones';
import { useConsulta } from '../_componentes/useConsulta';
import { textoClases, textoMediciones, textoRacRap, uno } from './resumen';

/** Lo que se ve mientras llega o si no se pudo leer: la tarjeta sigue enlazando a su pantalla. */
type Valor =
  | { estado: 'cargando' }
  | { estado: 'fallida' }
  | { estado: 'lista'; principal: string; detalle?: string; alerta?: boolean };

/**
 * Resumen del proyecto (HU-12-07; RF-25): en qué va, de un vistazo, en la ficha, que es la
 * entrada del docente a su proyecto. Cada número sale de un endpoint que ya usa su pantalla y
 * enlaza a ella. Si el backend no le entrega un dato a quien mira, esa tarjeta queda sin número
 * pero sigue enlazando: la pantalla dirá por qué.
 */
export function ResumenProyecto({
  proyecto,
  veMediciones,
}: {
  proyecto: ProyectoDocenteDetalle;
  veMediciones: boolean;
}) {
  const id = proyecto.id;
  const ruta = (destino: string) => `/proyectos-docentes/${id}/${destino}`;

  const diligenciamiento = useConsulta(
    `resumen-diligenciamiento-${id}`,
    (senal) => consultarDiligenciamiento(id, senal),
  );
  const calendario = useConsulta(`resumen-calendario-${id}`, (senal) =>
    consultarCalendario(id, senal),
  );
  const rac = useConsulta(`resumen-rac-${id}`, (senal) =>
    consultarRac(id, senal),
  );
  const evidencias = useConsulta(`resumen-evidencias-${id}`, (senal) =>
    consultarOpcionesEvidencias(id, senal),
  );
  const mediciones = useConsulta(
    veMediciones ? `resumen-mediciones-${id}` : null,
    (senal) => consultarMedicionesDelProyecto(id, senal),
  );

  const secciones: Valor =
    diligenciamiento.estado === 'lista'
      ? {
          estado: 'lista',
          principal: `${diligenciamiento.datos.completitud.completas} de ${diligenciamiento.datos.completitud.total}`,
          detalle: 'secciones completas',
          alerta:
            diligenciamiento.datos.completitud.completas <
            diligenciamiento.datos.completitud.total,
        }
      : sinDatos(diligenciamiento.estado);

  const clases: Valor =
    calendario.estado === 'lista'
      ? { estado: 'lista', ...textoClases(calendario.datos) }
      : sinDatos(calendario.estado);

  const racRap: Valor =
    rac.estado === 'lista'
      ? { estado: 'lista', ...textoRacRap(rac.datos, proyecto.raps.length) }
      : sinDatos(rac.estado);

  const totalEvidencias =
    evidencias.estado === 'lista'
      ? evidencias.datos.raps.reduce(
          (suma, rap) => suma + rap.totalEvidencias,
          0,
        )
      : 0;
  const evidenciasValor: Valor =
    evidencias.estado === 'lista'
      ? {
          estado: 'lista',
          principal: String(totalEvidencias),
          detalle: uno(totalEvidencias, 'evidencia', 'evidencias'),
        }
      : sinDatos(evidencias.estado);

  const medicionesValor: Valor =
    mediciones.estado === 'lista'
      ? { estado: 'lista', ...textoMediciones(mediciones.datos.mediciones) }
      : sinDatos(mediciones.estado);

  return (
    <section aria-labelledby="titulo-resumen" className="space-y-2">
      <h2 id="titulo-resumen" className="sr-only">
        Resumen del proyecto
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tarjeta
          titulo="Estado"
          href={ruta('diligenciar')}
          valor={{
            estado: 'lista',
            principal: proyecto.estado?.nombre ?? 'Sin estado',
          }}
          texto
        />
        <Tarjeta
          titulo="Secciones"
          href={ruta('diligenciar')}
          valor={secciones}
        />
        <Tarjeta titulo="Clases" href={ruta('calendario')} valor={clases} />
        <Tarjeta titulo="RAC y RAP" href={ruta('diligenciar')} valor={racRap} />
        <Tarjeta
          titulo="Evidencias"
          href={ruta('evidencias')}
          valor={evidenciasValor}
        />
        {veMediciones && (
          <Tarjeta
            titulo="Mediciones"
            href={ruta('mediciones')}
            valor={medicionesValor}
          />
        )}
      </ul>
    </section>
  );
}

/** Sin datos todavía: cargando, o no se pudo leer (o no aplica). */
function sinDatos(estado: string): Valor {
  return { estado: estado === 'cargando' ? 'cargando' : 'fallida' };
}

function Tarjeta({
  titulo,
  href,
  valor,
  texto = false,
}: {
  titulo: string;
  href: string;
  valor: Valor;
  /** El valor es una palabra (el estado), no un número: va en letra más pequeña. */
  texto?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full min-h-11 flex-col justify-between gap-0.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm hover:border-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
      >
        <span className="text-xs font-medium tracking-wide text-slate-600 uppercase">
          {titulo}
        </span>
        {valor.estado === 'lista' ? (
          <span>
            <span
              className={`block font-bold ${texto ? 'text-base leading-tight' : 'text-xl leading-tight'} ${valor.alerta ? 'text-amber-800' : 'text-slate-900'}`}
            >
              {valor.principal}
            </span>
            {valor.detalle && (
              <span className="block text-xs text-slate-600">
                {valor.detalle}
              </span>
            )}
          </span>
        ) : (
          <span className="text-sm text-slate-500">
            {valor.estado === 'cargando' ? 'Cargando…' : 'Ver →'}
          </span>
        )}
      </Link>
    </li>
  );
}
