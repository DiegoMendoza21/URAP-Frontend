'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import {
  type ConsultaCumplimiento,
  consultarCumplimiento,
  descargarCumplimientoExcel,
  type ReporteCumplimiento as DatosReporte,
} from '@/api/reportes';
import {
  consultarFiltrosSeguimiento,
  type FiltrosSeguimiento,
} from '@/api/seguimiento';
import { porcentaje } from '@/componentes/formato';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { Evidencias, Secciones, Sesiones } from '../../seguimiento/Indicadores';
import { Semaforo } from '../../seguimiento/Semaforo';
import { Exportar } from '../_componentes/Exportar';

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/**
 * Reporte de cumplimiento por período (RF-28, HU-12-03): los proyectos docentes, su estado y su
 * diligenciamiento, con las mismas reglas del tablero de seguimiento (RF-25). Se genera a pedido
 * y el backend registra cada generación (p6).
 */
export function ReporteCumplimiento() {
  const filtros = useConsulta(
    'filtros-cumplimiento',
    consultarFiltrosSeguimiento,
  );
  // `numero` cambia con cada clic en «Generar reporte»: con los mismos filtros también se
  // vuelve a pedir.
  const [solicitud, setSolicitud] = useState<{
    consulta: ConsultaCumplimiento;
    numero: number;
  } | null>(null);
  const reporte = useConsulta(
    solicitud === null ? null : `cumplimiento-${solicitud.numero}`,
    (senal) => consultarCumplimiento(solicitud!.consulta, senal),
  );

  return (
    <section aria-labelledby="titulo-cumplimiento" className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/reportes"
          className="text-sm font-medium text-marca hover:underline print:hidden"
        >
          ← Reportes
        </Link>
        <h1 id="titulo-cumplimiento" className="text-2xl font-bold sm:text-3xl">
          Reporte de cumplimiento
        </h1>
        {reporte.estado === 'lista' && (
          <p className="text-slate-700">
            Período {reporte.datos.periodo?.codigo ?? 'sin definir'} · Generado
            el {formatoFecha.format(new Date(reporte.datos.generado))}
          </p>
        )}
      </div>

      {filtros.estado === 'cargando' && <Cargando />}
      {filtros.estado === 'fallida' && (
        <AvisoError
          mensaje={filtros.mensaje}
          reintentar={filtros.reintentable ? filtros.reintentar : undefined}
        />
      )}
      {filtros.estado === 'lista' && (
        <Filtros
          opciones={filtros.datos}
          alConsultar={(consulta) =>
            setSolicitud((anterior) => ({
              consulta,
              numero: (anterior?.numero ?? 0) + 1,
            }))
          }
        />
      )}

      {reporte.estado === 'cargando' && (
        <Cargando texto="Generando el reporte…" />
      )}
      {reporte.estado === 'fallida' && (
        <AvisoError
          mensaje={reporte.mensaje}
          reintentar={reporte.reintentable ? reporte.reintentar : undefined}
        />
      )}
      {reporte.estado === 'lista' && solicitud && (
        <Resultado datos={reporte.datos} consulta={solicitud.consulta} />
      )}
    </section>
  );
}

/** RF-28, p2: período, programa, asignatura, docente y estado. */
function Filtros({
  opciones,
  alConsultar,
}: {
  opciones: FiltrosSeguimiento;
  alConsultar: (consulta: ConsultaCumplimiento) => void;
}) {
  const ids = {
    periodo: useId(),
    programa: useId(),
    asignatura: useId(),
    docente: useId(),
    estado: useId(),
  };
  const [valores, setValores] = useState({
    idPeriodo: String(
      opciones.periodos.find((periodo) => periodo.vigente)?.id ??
        opciones.periodos[0]?.id ??
        '',
    ),
    idPrograma: '',
    idAsignatura: '',
    idDocente: '',
    estado: '',
  });
  const cambiar = (campo: keyof typeof valores, valor: string) =>
    setValores((actuales) => ({
      ...actuales,
      [campo]: valor,
      ...(campo === 'idPrograma' ? { idAsignatura: '' } : {}),
    }));
  const asignaturas = opciones.asignaturas.filter(
    (asignatura) =>
      !valores.idPrograma ||
      String(asignatura.idPrograma) === valores.idPrograma,
  );
  const numero = (valor: string) => (valor ? Number(valor) : undefined);

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    alConsultar({
      idPeriodo: numero(valores.idPeriodo),
      idPrograma: numero(valores.idPrograma),
      idAsignatura: numero(valores.idAsignatura),
      idDocente: numero(valores.idDocente),
      estado: valores.estado || undefined,
    });
  };

  const clase =
    'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  const campos: {
    id: string;
    campo: keyof typeof valores;
    etiqueta: string;
    todas?: string;
    opciones: { valor: string; texto: string }[];
  }[] = [
    {
      id: ids.periodo,
      campo: 'idPeriodo',
      etiqueta: 'Período académico',
      opciones: opciones.periodos.map((periodo) => ({
        valor: String(periodo.id),
        texto: `${periodo.codigo}${periodo.vigente ? ' (vigente)' : ''}`,
      })),
    },
    {
      id: ids.programa,
      campo: 'idPrograma',
      etiqueta: 'Programa',
      todas: 'Todos',
      opciones: opciones.programas.map((programa) => ({
        valor: String(programa.id),
        texto: programa.nombre,
      })),
    },
    {
      id: ids.asignatura,
      campo: 'idAsignatura',
      etiqueta: 'Asignatura',
      todas: 'Todas',
      opciones: asignaturas.map((asignatura) => ({
        valor: String(asignatura.id),
        texto: asignatura.nombre,
      })),
    },
    {
      id: ids.docente,
      campo: 'idDocente',
      etiqueta: 'Docente',
      todas: 'Todos',
      opciones: opciones.docentes.map((docente) => ({
        valor: String(docente.id),
        texto: docente.nombre,
      })),
    },
    {
      id: ids.estado,
      campo: 'estado',
      etiqueta: 'Estado del proyecto',
      todas: 'Todos',
      opciones: opciones.estados.map((estado) => ({
        valor: estado.codigo,
        texto: estado.nombre,
      })),
    },
  ];

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 print:hidden"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campos.map((campo) => (
          <div key={campo.id} className="space-y-1">
            <label htmlFor={campo.id} className="block font-medium">
              {campo.etiqueta}
            </label>
            <select
              id={campo.id}
              value={valores[campo.campo]}
              onChange={(evento) => cambiar(campo.campo, evento.target.value)}
              className={clase}
            >
              {campo.todas && <option value="">{campo.todas}</option>}
              {campo.opciones.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.texto}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca sm:w-auto"
      >
        Generar reporte
      </button>
    </form>
  );
}

function Resultado({
  datos,
  consulta,
}: {
  datos: DatosReporte;
  consulta: ConsultaCumplimiento;
}) {
  const { resumen } = datos;
  if (datos.proyectos.length === 0) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm"
      >
        No hay proyectos docentes para los filtros seleccionados.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <Exportar descargar={() => descargarCumplimientoExcel(consulta)} />

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <dt className="text-sm text-slate-600">Proyectos docentes</dt>
          <dd className="text-2xl font-bold">{resumen.proyectos}</dd>
          <dd className="text-xs text-slate-600">
            {resumen.conPendientes} con pendientes
          </dd>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <dt className="text-sm text-slate-600">Secciones completas</dt>
          <dd className="text-2xl font-bold">
            {porcentaje(resumen.porcentajeSecciones)}
          </dd>
          <dd className="text-xs text-slate-600">
            {resumen.seccionesCompletas} de {resumen.seccionesTotales}
          </dd>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <dt className="text-sm text-slate-600">Sesiones registradas</dt>
          <dd className="text-2xl font-bold">
            {porcentaje(resumen.porcentajeSesiones)}
          </dd>
          <dd className="text-xs text-slate-600">
            {resumen.sesionesRegistradas} de {resumen.sesionesProgramadas}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="titulo-por-estado" className="space-y-2">
        <h2 id="titulo-por-estado" className="font-semibold">
          Proyectos por estado
        </h2>
        <ul className="flex flex-wrap gap-2">
          {resumen.porEstado.map((estado) => (
            <li key={estado.codigo}>
              <Insignia tono="marca">
                {estado.nombre}: {estado.cantidad}
              </Insignia>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-proyectos" className="space-y-2">
        <h2 id="titulo-proyectos" className="font-semibold">
          Proyectos
        </h2>
        <ul className="space-y-3">
          {datos.proyectos.map((proyecto) => (
            <li
              key={proyecto.idProyecto}
              className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:break-inside-avoid print:shadow-none"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/proyectos-docentes/${proyecto.idProyecto}`}
                    className="font-semibold text-marca hover:underline"
                  >
                    {proyecto.asignatura}
                    {proyecto.grupo ? ` · Grupo ${proyecto.grupo}` : ''}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {proyecto.docentes.join(', ') || 'Sin docente'}
                    {proyecto.programa ? ` · ${proyecto.programa}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Insignia tono="marca">
                    {proyecto.estado?.nombre ?? 'Sin estado'}
                  </Insignia>
                  <Semaforo color={proyecto.color} />
                </div>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-medium text-slate-600">Secciones</dt>
                  <dd>
                    <Secciones proyecto={proyecto} />
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-600">Sesiones</dt>
                  <dd>
                    <Sesiones proyecto={proyecto} />
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-600">
                    Evidencias por RAP
                  </dt>
                  <dd>
                    <Evidencias proyecto={proyecto} />
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
