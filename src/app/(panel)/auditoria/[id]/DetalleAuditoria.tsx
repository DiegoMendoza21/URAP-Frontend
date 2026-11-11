'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  type AccionAuditoria,
  consultarRegistroAuditoria,
  type DetalleAuditoria as Detalle,
} from '@/api/auditoria';
import { usePermisos } from '@/sesion/permisos';
import {
  AvisoError,
  Cargando,
  Insignia,
} from '../../proyectos-docentes/_componentes/Estados';
import { useConsulta } from '../../proyectos-docentes/_componentes/useConsulta';
import { useRutaListado } from '../consultaGuardada';
import {
  type CampoComparado,
  compararValores,
  cuando,
  nombreEvento,
  PERMISO_AUDITORIA,
  queHizo,
  quien,
  rutaDelRegistro,
  sobreQue,
  tonoEvento,
} from '../textos';

/**
 * Detalle de un registro de auditoría (HU-14-03): quién, cuándo y desde dónde, y el valor
 * anterior y el nuevo campo por campo. Desde aquí se abre el historial completo del registro
 * afectado.
 */
export function DetalleAuditoria() {
  const tiene = usePermisos();
  const rutaListado = useRutaListado();
  const { id: idTexto } = useParams<{ id: string }>();
  const id = /^\d+$/.test(idTexto) ? Number(idTexto) : null;
  const puede = tiene(PERMISO_AUDITORIA);
  const registro = useConsulta(
    puede && id !== null ? `auditoria-registro-${id}` : null,
    (senal) => consultarRegistroAuditoria(id!, senal),
  );

  return (
    <section aria-labelledby="titulo-registro" className="space-y-6">
      <div className="space-y-1">
        <Link
          href={rutaListado}
          className="text-sm font-medium text-marca hover:underline"
        >
          ← Auditoría
        </Link>
        <h1 id="titulo-registro" className="text-2xl font-bold sm:text-3xl">
          Registro de auditoría{id !== null ? ` n.º ${id}` : ''}
        </h1>
      </div>

      {!puede && (
        <AvisoError mensaje="No tiene permiso para consultar la auditoría." />
      )}
      {puede && id === null && (
        <AvisoError mensaje="No existe ese registro de auditoría." />
      )}
      {registro.estado === 'cargando' && <Cargando />}
      {registro.estado === 'fallida' && (
        <AvisoError
          mensaje={registro.mensaje}
          reintentar={registro.reintentable ? registro.reintentar : undefined}
        />
      )}
      {registro.estado === 'lista' && <Contenido registro={registro.datos} />}
    </section>
  );
}

function Contenido({ registro }: { registro: Detalle }) {
  const rutaRegistro = rutaDelRegistro(registro.entidad, registro.idRegistro);
  return (
    <>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-lg text-slate-900">
          <span className="font-semibold">{quien(registro)}</span>{' '}
          {queHizo(registro)}.
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Dato termino="Cuándo">{cuando(registro.fecha, true)}</Dato>
          <Dato termino="Quién">
            {registro.usuario
              ? registro.usuario.nombre
              : 'El sistema, sin intervención de una persona'}
          </Dato>
          <Dato termino="Qué hizo">
            <Insignia tono={tonoEvento(registro.evento)}>
              {nombreEvento(registro.evento)}
            </Insignia>
          </Dato>
          <Dato termino="Sobre qué">
            {sobreQue(registro.entidad, registro.idRegistro)}
            {rutaRegistro && (
              <>
                {' · '}
                <Link
                  href={rutaRegistro}
                  className="font-semibold text-marca hover:underline"
                >
                  Abrir
                </Link>
              </>
            )}
          </Dato>
          <Dato termino="Dirección IP">{registro.ip ?? 'Sin registrar'}</Dato>
        </dl>
      </div>

      <Cambios registro={registro} />

      {registro.idRegistro !== null && (
        <Link
          href={`/auditoria?${new URLSearchParams({
            entidad: registro.entidad,
            idRegistro: String(registro.idRegistro),
          })}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50"
        >
          Ver el historial completo de este registro
        </Link>
      )}
    </>
  );
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-slate-600">{termino}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}

const SIN_VALORES: Record<AccionAuditoria, string> = {
  crear: 'Este registro no guardó los valores con los que se creó.',
  actualizar: 'Este registro no guardó qué campos cambiaron.',
  eliminar: 'Este registro no guardó los valores que se eliminaron.',
  aprobar: 'Este registro no guardó qué campos cambiaron.',
  consulta_sensible:
    'Una consulta no cambia nada: por eso no hay valor anterior ni valor nuevo.',
};

/** El valor anterior y el nuevo, lado a lado en pantalla ancha y uno debajo del otro en el teléfono. */
function Cambios({ registro }: { registro: Detalle }) {
  const { valorAnterior, valorNuevo } = registro;
  const campos = compararValores(valorAnterior, valorNuevo);
  const hayAnterior = valorAnterior !== null;
  const hayNuevo = valorNuevo !== null;

  return (
    <section
      aria-labelledby="titulo-cambios"
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="titulo-cambios" className="text-lg font-semibold">
        {hayAnterior && hayNuevo
          ? 'Valor anterior y valor nuevo'
          : hayNuevo
            ? 'Valores registrados'
            : hayAnterior
              ? 'Valores anteriores'
              : 'Valores'}
      </h2>

      {campos.length === 0 && (
        <p className="text-slate-700">
          {SIN_VALORES[registro.accion] ?? 'Este registro no guardó valores.'}
        </p>
      )}

      {campos.length > 0 && hayAnterior && hayNuevo && (
        <>
          <p className="text-sm text-slate-700">
            {campos.filter((campo) => campo.cambio).length === campos.length
              ? 'Todos los campos cambiaron.'
              : 'Los campos que cambiaron están resaltados.'}
          </p>
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            <div
              aria-hidden="true"
              className="hidden bg-slate-50 px-3 py-2 text-sm font-semibold md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)] md:gap-3"
            >
              <span>Campo</span>
              <span>Valor anterior</span>
              <span>Valor nuevo</span>
            </div>
            {campos.map((campo) => (
              <Comparacion key={campo.campo} campo={campo} />
            ))}
          </div>
        </>
      )}

      {campos.length > 0 && !(hayAnterior && hayNuevo) && (
        <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
          {campos.map((campo) => (
            <div
              key={campo.campo}
              className="px-3 py-2 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:gap-3"
            >
              <dt className="font-medium text-slate-900">{campo.nombre}</dt>
              <dd className="break-words whitespace-pre-line text-slate-800">
                {campo.nuevo ?? campo.anterior}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Un campo con su valor de antes y el de después. El cambio se dice con texto y con color. */
function Comparacion({ campo }: { campo: CampoComparado }) {
  return (
    <div className="space-y-2 px-3 py-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)] md:gap-3 md:space-y-0">
      <div className="flex flex-wrap items-start gap-2 md:block md:space-y-1">
        <p className="font-medium text-slate-900">{campo.nombre}</p>
        {campo.cambio ? (
          <Insignia tono="advertencia">Cambió</Insignia>
        ) : (
          <Insignia>Sin cambio</Insignia>
        )}
      </div>
      <Lado
        titulo="Valor anterior"
        valor={campo.anterior}
        resaltado={campo.cambio ? 'anterior' : null}
      />
      <Lado
        titulo="Valor nuevo"
        valor={campo.nuevo}
        resaltado={campo.cambio ? 'nuevo' : null}
      />
    </div>
  );
}

function Lado({
  titulo,
  valor,
  resaltado,
}: {
  titulo: string;
  valor: string | undefined;
  resaltado: 'anterior' | 'nuevo' | null;
}) {
  const fondo =
    resaltado === 'anterior'
      ? 'border-red-200 bg-red-50'
      : resaltado === 'nuevo'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-slate-50';
  return (
    <div className={`rounded-lg border px-3 py-2 ${fondo}`}>
      {/* En pantalla ancha el encabezado de la columna ya lo dice. */}
      <p className="text-xs font-semibold text-slate-600 md:sr-only">
        {titulo}
      </p>
      <p className="break-words whitespace-pre-line text-slate-900">
        {valor ?? (
          <span className="text-slate-600">No estaba en el registro</span>
        )}
      </p>
    </div>
  );
}
