'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { ErrorApi, mensajeParaUsuario } from '@/api/cliente';
import {
  consultarMedicionesDelProyecto,
  etiquetaTipo,
  etiquetaToma,
  iniciarMedicion,
  type MedicionesDelProyecto,
  nombreRap,
  PERIODOS_TOMA,
  type PeriodoToma,
  type TipoValoracion,
  TIPOS_VALORACION,
} from '@/api/mediciones';
import {
  Advertencia,
  AvisoError,
  Cargando,
  Insignia,
} from '../../_componentes/Estados';
import { useConsulta } from '../../_componentes/useConsulta';

/**
 * Medición de RAP del curso (RF-30, p1 y p2; HU-11-01). Muestra las precondiciones —proyecto
 * aprobado, lista de estudiantes y rúbrica vigente de cada RAP— con sus excepciones, el
 * formulario con que el docente asignado inicia una medición y las mediciones registradas.
 */
export function MedicionesProyecto() {
  const { id } = useParams<{ id: string }>();
  const idProyecto = /^\d+$/.test(id) ? Number(id) : null;
  const consulta = useConsulta(
    idProyecto === null ? null : `mediciones-proyecto-${idProyecto}`,
    (senal) => consultarMedicionesDelProyecto(idProyecto!, senal),
  );

  return (
    <section aria-labelledby="titulo-mediciones" className="space-y-6">
      <div className="space-y-1">
        <Link
          href={
            idProyecto === null
              ? '/proyectos-docentes'
              : `/proyectos-docentes/${idProyecto}`
          }
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Proyecto docente
        </Link>
        <h1 id="titulo-mediciones" className="text-2xl font-bold sm:text-3xl">
          Medición de RAP
        </h1>
        {consulta.estado === 'lista' && (
          <p className="text-slate-700">
            {consulta.datos.proyecto.asignatura}
            {consulta.datos.proyecto.grupo
              ? ` · Grupo ${consulta.datos.proyecto.grupo}`
              : ''}
            {consulta.datos.proyecto.periodo
              ? ` · Período ${consulta.datos.proyecto.periodo}`
              : ''}
          </p>
        )}
      </div>

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
      {consulta.estado === 'lista' && idProyecto !== null && (
        <>
          <Requisitos idProyecto={idProyecto} datos={consulta.datos} />
          {consulta.datos.puedeRegistrar && (
            <FormularioInicio idProyecto={idProyecto} datos={consulta.datos} />
          )}
          <ListaMediciones datos={consulta.datos} />
        </>
      )}
    </section>
  );
}

/** Precondiciones de RF-30 y sus excepciones, en lenguaje del docente. */
function Requisitos({
  idProyecto,
  datos,
}: {
  idProyecto: number;
  datos: MedicionesDelProyecto;
}) {
  const { requisitos, raps, estadoProyecto } = datos;
  const sinRubrica = raps.filter((rap) => rap.rubricaVigente === null);
  if (
    requisitos.proyectoAprobado &&
    requisitos.periodoAbierto &&
    requisitos.listaCargada &&
    sinRubrica.length === 0
  ) {
    return null;
  }
  return (
    <div className="space-y-3">
      {!requisitos.proyectoAprobado && (
        <Advertencia titulo="El proyecto docente todavía no está aprobado.">
          <p>
            La medición de RAP se registra cuando el departamento académico
            aprueba el proyecto
            {estadoProyecto ? ` (hoy está «${estadoProyecto.nombre}»)` : ''}.
          </p>
        </Advertencia>
      )}
      {!requisitos.periodoAbierto && (
        <Advertencia titulo="El período académico del curso está cerrado.">
          <p>Ya no se pueden iniciar mediciones en este curso.</p>
        </Advertencia>
      )}
      {!requisitos.listaCargada && (
        <Advertencia titulo="Este curso todavía no tiene la lista de estudiantes.">
          <p>
            Sin la lista no se puede iniciar la medición. Pídale al
            administrador de URAP que la cargue: indique la asignatura, el grupo
            y el período de este curso.
          </p>
          <p>
            <Link
              href={`/proyectos-docentes/${idProyecto}/matriculados`}
              className="font-semibold underline"
            >
              Ver estudiantes matriculados
            </Link>
          </p>
        </Advertencia>
      )}
      {sinRubrica.length > 0 && (
        <Advertencia
          titulo={
            sinRubrica.length === 1
              ? `${nombreRap(sinRubrica[0])} no tiene una rúbrica vigente.`
              : `${sinRubrica.map(nombreRap).join(', ')} no tienen una rúbrica vigente.`
          }
        >
          <p>
            No se puede medir un RAP sin rúbrica. El programa debe registrarla
            primero (gestión de la rúbrica del RAP, RF-06).
          </p>
        </Advertencia>
      )}
    </div>
  );
}

type EstadoEnvio =
  | { estado: 'inactivo' }
  | { estado: 'enviando' }
  | { estado: 'fallido'; mensaje: string; detalles?: string[] };

const ANIO_ACTUAL = new Date().getFullYear();

/** HU-11-01: RAP, tipo de valoración, período y año de toma de datos. */
function FormularioInicio({
  idProyecto,
  datos,
}: {
  idProyecto: number;
  datos: MedicionesDelProyecto;
}) {
  const router = useRouter();
  const ids = {
    rap: useId(),
    anio: useId(),
    cohorte: useId(),
    ayudaCohorte: useId(),
  };
  const medibles = datos.raps.filter((rap) => rap.rubricaVigente !== null);
  const [idRap, setIdRap] = useState<string>(
    medibles.length === 1 ? String(medibles[0].id) : '',
  );
  const [tipo, setTipo] = useState<TipoValoracion>('formativa');
  const [periodo, setPeriodo] = useState<PeriodoToma>(
    datos.periodoSugerido?.periodoToma ?? 'primer',
  );
  const [anio, setAnio] = useState(
    String(datos.periodoSugerido?.anioToma ?? ANIO_ACTUAL),
  );
  const [cohorte, setCohorte] = useState('');
  const [envio, setEnvio] = useState<EstadoEnvio>({ estado: 'inactivo' });

  const bloqueado =
    !datos.requisitos.proyectoAprobado ||
    !datos.requisitos.periodoAbierto ||
    !datos.requisitos.listaCargada ||
    medibles.length === 0;

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!idRap) {
      setEnvio({ estado: 'fallido', mensaje: 'Seleccione el RAP a evaluar.' });
      return;
    }
    if (!/^\d{4}$/.test(anio.trim())) {
      setEnvio({
        estado: 'fallido',
        mensaje: 'Escriba el año de toma de datos con cuatro cifras.',
      });
      return;
    }
    if (cohorte.trim() && !/^\d+$/.test(cohorte.trim())) {
      setEnvio({
        estado: 'fallido',
        mensaje: 'El tamaño de la cohorte debe ser un número entero.',
      });
      return;
    }
    setEnvio({ estado: 'enviando' });
    try {
      const medicion = await iniciarMedicion(idProyecto, {
        idRap: Number(idRap),
        tipoValoracion: tipo,
        periodoToma: periodo,
        anioToma: Number(anio),
        tamanoCohorte: cohorte.trim() ? Number(cohorte) : null,
      });
      router.push(`/mediciones/${medicion.id}`);
    } catch (error) {
      setEnvio({
        estado: 'fallido',
        mensaje: mensajeParaUsuario(error),
        detalles: error instanceof ErrorApi ? error.detalles : undefined,
      });
    }
  };

  const claseOpcion = (activa: boolean) =>
    `flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marca ${
      activa
        ? 'border-marca bg-marca text-white'
        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
    }`;

  return (
    <section
      aria-labelledby="titulo-iniciar"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="titulo-iniciar" className="text-lg font-semibold">
        Iniciar una medición
      </h2>
      {bloqueado ? (
        <p className="text-sm text-slate-600">
          Podrá iniciar una medición cuando se resuelva lo que se indica arriba.
        </p>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor={ids.rap} className="block font-medium">
              RAP a evaluar
            </label>
            <select
              id={ids.rap}
              value={idRap}
              onChange={(evento) => setIdRap(evento.target.value)}
              className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Seleccione…</option>
              {datos.raps.map((rap) => (
                <option
                  key={rap.id}
                  value={rap.id}
                  disabled={rap.rubricaVigente === null}
                >
                  {nombreRap(rap)}
                  {rap.rubricaVigente === null
                    ? ' (sin rúbrica vigente)'
                    : ` · rúbrica versión ${rap.rubricaVigente.version ?? 1}, ${rap.rubricaVigente.indicadores} indicadores`}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-1">
            <legend className="font-medium">Tipo de valoración</legend>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_VALORACION.map((opcion) => (
                <label
                  key={opcion.valor}
                  className={claseOpcion(tipo === opcion.valor)}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={opcion.valor}
                    checked={tipo === opcion.valor}
                    onChange={() => setTipo(opcion.valor)}
                    className="sr-only"
                  />
                  {opcion.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1">
            <legend className="font-medium">Toma de datos</legend>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem]">
              {PERIODOS_TOMA.map((opcion) => (
                <label
                  key={opcion.valor}
                  className={claseOpcion(periodo === opcion.valor)}
                >
                  <input
                    type="radio"
                    name="periodo"
                    value={opcion.valor}
                    checked={periodo === opcion.valor}
                    onChange={() => setPeriodo(opcion.valor)}
                    className="sr-only"
                  />
                  {opcion.etiqueta}
                </label>
              ))}
              <div>
                <label htmlFor={ids.anio} className="sr-only">
                  Año de toma de datos
                </label>
                <input
                  id={ids.anio}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={anio}
                  onChange={(evento) => setAnio(evento.target.value)}
                  placeholder="Año"
                  className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center"
                />
              </div>
            </div>
          </fieldset>

          <div className="space-y-1">
            <label htmlFor={ids.cohorte} className="block font-medium">
              Tamaño de la cohorte{' '}
              <span className="font-normal">(opcional)</span>
            </label>
            <input
              id={ids.cohorte}
              inputMode="numeric"
              autoComplete="off"
              value={cohorte}
              onChange={(evento) => setCohorte(evento.target.value)}
              aria-describedby={ids.ayudaCohorte}
              className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-40"
            />
            <p id={ids.ayudaCohorte} className="text-sm text-slate-600">
              Si no lo conoce, déjelo vacío: los porcentajes se calculan sobre
              los estudiantes valorados.
            </p>
          </div>

          <button
            type="submit"
            disabled={envio.estado === 'enviando'}
            className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-60 sm:w-auto"
          >
            {envio.estado === 'enviando' ? 'Iniciando…' : 'Iniciar medición'}
          </button>
        </form>
      )}
      {envio.estado === 'fallido' && (
        <AvisoError mensaje={envio.mensaje} detalles={envio.detalles} />
      )}
    </section>
  );
}

function ListaMediciones({ datos }: { datos: MedicionesDelProyecto }) {
  return (
    <section
      aria-labelledby="titulo-registradas"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="titulo-registradas" className="text-lg font-semibold">
        Mediciones registradas
      </h2>
      {datos.mediciones.length === 0 ? (
        <p className="text-sm text-slate-600">
          Este curso todavía no tiene mediciones de RAP.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {datos.mediciones.map((medicion) => (
            <li key={medicion.id}>
              <Link
                href={`/mediciones/${medicion.id}`}
                className="flex items-center justify-between gap-3 py-3 hover:text-marca"
              >
                <span className="space-y-1">
                  <span className="block font-semibold">
                    {nombreRap(medicion.rap)} ·{' '}
                    {etiquetaTipo(medicion.tipoValoracion)}
                  </span>
                  <span className="block text-sm text-slate-600">
                    {etiquetaToma(medicion.periodoToma, medicion.anioToma)}
                    {medicion.versionRubrica !== null &&
                      ` · rúbrica versión ${medicion.versionRubrica}`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Insignia
                    tono={
                      medicion.estado === 'cerrada' ? 'neutro' : 'advertencia'
                    }
                  >
                    {medicion.estado === 'cerrada' ? 'Cerrada' : 'Borrador'}
                  </Insignia>
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
