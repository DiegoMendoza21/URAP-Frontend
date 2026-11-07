'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { mensajeParaUsuario } from '@/api/cliente';
import {
  cambioRechazado,
  consultarContenidos,
  guardarContenidos,
  type SeccionContenidos as DatosSeccionContenidos,
  type SemanaContenido,
} from '@/api/diligenciamiento';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';
import {
  BotonGuardar,
  BotonSecundario,
  ConfirmacionGuardado,
} from './Controles';
import type { PropiedadesSeccion } from './DiligenciamientoProyecto';

/** Mismos límites que valida el backend (GuardarContenidosDto). */
const TEMA_MAXIMO = 255;
const HORAS_MAXIMO = 99;

const TIPOS = [
  { campo: 'tde', tipo: 'TDE', nombre: 'Horas TDE', ayuda: 'teóricas' },
  { campo: 'tdp', tipo: 'TDP', nombre: 'Horas TDP', ayuda: 'prácticas' },
  { campo: 'ti', tipo: 'TI', nombre: 'Horas TI', ayuda: 'independientes' },
] as const;

type CampoHoras = (typeof TIPOS)[number]['campo'];

/** Una semana como la escribe el docente: las horas son texto hasta guardar. */
interface Fila extends Record<CampoHoras, string> {
  semana: number;
  tema: string;
}

function aFilas(seccion: DatosSeccionContenidos): Fila[] {
  const texto = (valor: number | null) => (valor === null ? '' : String(valor));
  return seccion.semanas.map((semana) => ({
    semana: semana.semana,
    tema: semana.tema ?? '',
    tde: texto(semana.horasTde),
    tdp: texto(semana.horasTdp),
    ti: texto(semana.horasTi),
  }));
}

/** Entero de 0 a 99, nulo si está vacío, NaN si no es válido. */
function leerHoras(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '') {
    return null;
  }
  return /^\d{1,2}$/.test(limpio) ? Number(limpio) : Number.NaN;
}

const huella = (filas: Fila[]) =>
  JSON.stringify(
    filas.map((f) => [f.tema.trim(), f.tde.trim(), f.tdp.trim(), f.ti.trim()]),
  );

/**
 * Punto 6 «Contenidos del curso» (RF-15, HU-06-06): una fila por semana del período con el
 * tema y las horas TDE, TDP y TI. Suma las horas mientras se escriben y las compara con las
 * de la asignatura (p4); si no coinciden, deja guardar igual. Señala las semanas sin tema (p5).
 */
export function SeccionContenidos({
  idProyecto,
  puedeEditar,
  alGuardar,
  alCambiar,
}: PropiedadesSeccion) {
  const consulta = useConsulta(`contenidos-${idProyecto}`, (senal) =>
    consultarContenidos(idProyecto, senal),
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
    <EditorContenidos
      idProyecto={idProyecto}
      inicial={consulta.datos}
      puedeEditar={puedeEditar}
      alGuardar={alGuardar}
      alCambiar={alCambiar}
    />
  );
}

function EditorContenidos({
  idProyecto,
  inicial,
  puedeEditar,
  alGuardar,
  alCambiar,
}: Omit<PropiedadesSeccion, 'idProyecto'> & {
  idProyecto: number;
  inicial: DatosSeccionContenidos;
}) {
  const id = useId();
  const [guardado, setGuardado] = useState(inicial);
  const [filas, setFilas] = useState(() => aFilas(inicial));
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recienGuardado, setRecienGuardado] = useState(false);

  const huellaGuardada = useMemo(() => huella(aFilas(guardado)), [guardado]);
  const hayCambios = huella(filas) !== huellaGuardada;
  useEffect(() => {
    alCambiar(hayCambios);
  }, [alCambiar, hayCambios]);

  if (guardado.numeroSemanas === null) {
    return (
      <Advertencia titulo="No se puede presentar la tabla de semanas">
        <p>
          El período académico no tiene definido su número de semanas. Pídale al
          administrador que lo registre.
        </p>
      </Advertencia>
    );
  }

  const sumas = Object.fromEntries(
    TIPOS.map(({ campo }) => [
      campo,
      filas.reduce((suma, fila) => {
        const horas = leerHoras(fila[campo]);
        return suma + (horas === null || Number.isNaN(horas) ? 0 : horas);
      }, 0),
    ]),
  ) as Record<CampoHoras, number>;
  const comparacion = [
    ...TIPOS.map(({ campo, tipo }) => ({ tipo, contenidos: sumas[campo] })),
    { tipo: 'Total', contenidos: sumas.tde + sumas.tdp + sumas.ti },
  ].map((fila) => {
    const asignatura =
      guardado.comparacion.find((c) => c.tipo === fila.tipo)?.asignatura ??
      null;
    return {
      ...fila,
      asignatura,
      diferencia: asignatura === null ? null : fila.contenidos - asignatura,
    };
  });
  const comparables = comparacion.filter((fila) => fila.diferencia !== null);
  const coinciden =
    comparables.length === 0
      ? null
      : comparables.every((fila) => fila.diferencia === 0);
  const sinTema = filas.filter((fila) => !fila.tema.trim());

  function cambiar(semana: number, cambio: Partial<Fila>) {
    setFilas((previas) =>
      previas.map((fila) =>
        fila.semana === semana ? { ...fila, ...cambio } : fila,
      ),
    );
    setRecienGuardado(false);
  }

  function copiarHorasDeLaPrimera() {
    const [primera] = filas;
    setFilas((previas) =>
      previas.map((fila) =>
        fila.tde.trim() || fila.tdp.trim() || fila.ti.trim()
          ? fila
          : { ...fila, tde: primera.tde, tdp: primera.tdp, ti: primera.ti },
      ),
    );
    setRecienGuardado(false);
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const faltas: string[] = [];
    const semanas: SemanaContenido[] = filas.map((fila) => {
      const horas = Object.fromEntries(
        TIPOS.map(({ campo, tipo }) => {
          const valor = leerHoras(fila[campo]);
          if (valor !== null && Number.isNaN(valor)) {
            faltas.push(
              `Semana ${fila.semana}: las horas ${tipo} deben ser un número entero de 0 a ${HORAS_MAXIMO}.`,
            );
          }
          return [campo, valor];
        }),
      ) as Record<CampoHoras, number | null>;
      return {
        semana: fila.semana,
        tema: fila.tema.trim() || null,
        horasTde: horas.tde,
        horasTdp: horas.tdp,
        horasTi: horas.ti,
      };
    });
    setErrores(faltas);
    setError(null);
    if (faltas.length > 0) {
      return;
    }
    setGuardando(true);
    try {
      const enviadas = huella(filas);
      const respuesta = await guardarContenidos(idProyecto, semanas);
      setGuardado(respuesta);
      // Lo que el docente escribió mientras se guardaba no se pisa: queda como cambio pendiente.
      setFilas((actuales) =>
        huella(actuales) === enviadas ? aFilas(respuesta) : actuales,
      );
      setRecienGuardado(true);
      alGuardar();
    } catch (falla) {
      setError(mensajeParaUsuario(falla));
      if (cambioRechazado(falla)) {
        alGuardar();
      }
    } finally {
      setGuardando(false);
    }
  }

  const resumenHoras = (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 sm:p-4">
      <h3 className="font-semibold">Total de horas del semestre</h3>
      <table className="w-full text-sm">
        <caption className="sr-only">
          Horas registradas en los contenidos frente a las de la asignatura
        </caption>
        <thead>
          <tr className="text-left text-slate-600">
            <th scope="col" className="py-1 pr-2 font-medium">
              Tipo
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              Contenidos
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              Asignatura
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              Diferencia
            </th>
          </tr>
        </thead>
        <tbody>
          {comparacion.map((fila) => (
            <tr
              key={fila.tipo}
              className={`border-t border-slate-100 ${fila.tipo === 'Total' ? 'font-semibold' : ''}`}
            >
              <th scope="row" className="py-1 pr-2 text-left font-medium">
                {fila.tipo}
              </th>
              <td className="py-1 pr-2 text-right">{fila.contenidos}</td>
              <td className="py-1 pr-2 text-right">
                {fila.asignatura ?? 'Sin dato'}
              </td>
              <td
                className={`py-1 text-right ${fila.diferencia ? 'text-amber-900' : ''}`}
              >
                {fila.diferencia === null
                  ? '—'
                  : fila.diferencia > 0
                    ? `+${fila.diferencia}`
                    : fila.diferencia}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {coinciden === true && (
        <p className="text-sm font-medium text-emerald-700">
          Las horas coinciden con las de la asignatura.
        </p>
      )}
      {coinciden === false && (
        <p role="status" className="text-sm font-medium text-amber-900">
          El total no coincide con las horas de la asignatura. Puede guardar
          igual: la diferencia queda registrada.
        </p>
      )}
    </div>
  );

  const avisoAsignatura = guardado.datosAsignaturaFaltantes.length > 0 && (
    <Advertencia titulo="Información incompleta de la asignatura">
      <p>
        El plan de estudios no registra{' '}
        {unir(guardado.datosAsignaturaFaltantes)} de esta asignatura, así que no
        es posible comparar
        {coinciden === null ? ' el total de horas' : ' todas las horas'}. El
        departamento académico debe completarlas.
      </p>
    </Advertencia>
  );

  if (!puedeEditar) {
    return (
      <div className="space-y-4">
        {avisoAsignatura}
        <ol className="space-y-2">
          {filas.map((fila) => (
            <li
              key={fila.semana}
              className="rounded-lg border border-slate-200 p-3 text-sm"
            >
              <p className="font-semibold">Semana {fila.semana}</p>
              <p className={fila.tema ? 'text-slate-800' : 'text-slate-600'}>
                {fila.tema || 'Sin tema.'}
              </p>
              <p className="text-slate-600">
                TDE {fila.tde || '—'} · TDP {fila.tdp || '—'} · TI{' '}
                {fila.ti || '—'}
              </p>
            </li>
          ))}
        </ol>
        {resumenHoras}
      </div>
    );
  }

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Registre el tema previsto y las horas de cada una de las{' '}
        {guardado.numeroSemanas} semanas del período. TDE son horas teóricas con
        el docente, TDP prácticas con el docente y TI de trabajo independiente.
        Estos temas son los que elegirá al registrar cada clase.
      </p>
      {avisoAsignatura}
      {resumenHoras}

      {sinTema.length > 0 && (
        <p role="status" className="text-sm font-medium text-amber-900">
          {sinTema.length === 1
            ? 'Falta el tema de 1 semana.'
            : `Falta el tema de ${sinTema.length} semanas.`}
        </p>
      )}
      <BotonSecundario onClick={copiarHorasDeLaPrimera}>
        Copiar las horas de la semana 1 a las semanas sin horas
      </BotonSecundario>

      <ol className="space-y-3">
        {filas.map((fila) => (
          <li
            key={fila.semana}
            className="space-y-2 rounded-lg border border-slate-200 p-3 sm:grid sm:grid-cols-[6rem_1fr_repeat(3,4.75rem)] sm:items-start sm:gap-3 sm:space-y-0"
          >
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:pt-6">
              <span className="font-semibold">Semana {fila.semana}</span>
              {!fila.tema.trim() && (
                <Insignia tono="advertencia">Sin tema</Insignia>
              )}
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`${id}-tema-${fila.semana}`}
                className="block text-sm font-medium"
              >
                Tema
                <span className="sr-only"> de la semana {fila.semana}</span>
              </label>
              <textarea
                id={`${id}-tema-${fila.semana}`}
                value={fila.tema}
                maxLength={TEMA_MAXIMO}
                rows={2}
                onChange={(evento) =>
                  cambiar(fila.semana, { tema: evento.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:contents">
              {TIPOS.map(({ campo, tipo, nombre, ayuda }) => (
                <div key={campo} className="space-y-1">
                  <label
                    htmlFor={`${id}-${campo}-${fila.semana}`}
                    className="block text-sm font-medium"
                    title={`Horas ${ayuda}`}
                  >
                    <abbr title={nombre} className="no-underline">
                      {tipo}
                    </abbr>
                  </label>
                  <input
                    id={`${id}-${campo}-${fila.semana}`}
                    aria-label={`${nombre} (${ayuda}) de la semana ${fila.semana}`}
                    value={fila[campo]}
                    inputMode="numeric"
                    maxLength={2}
                    onChange={(evento) =>
                      cambiar(fila.semana, { [campo]: evento.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                  />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {errores.length > 0 && (
        <AvisoError
          mensaje="Revise los contenidos antes de guardarlos:"
          detalles={errores}
        />
      )}
      {error && <AvisoError mensaje={error} />}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-lg sm:px-0">
        <ConfirmacionGuardado
          visible={recienGuardado && !hayCambios}
          pendiente={hayCambios}
          ultimaModificacion={null}
        />
        <BotonGuardar guardando={guardando} deshabilitado={!hayCambios}>
          Guardar contenidos
        </BotonGuardar>
      </div>
    </form>
  );
}

/** «a», «a y b», «a, b y c». */
function unir(partes: string[]): string {
  return partes.length > 1
    ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
    : (partes[0] ?? '');
}
