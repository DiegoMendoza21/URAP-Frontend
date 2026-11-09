import type { ReactNode } from 'react';
import type { InformacionInstitucional } from '@/api/proyectos-docentes';
import { Advertencia } from './Estados';

function SinRegistrar() {
  return <span className="font-medium text-amber-800">Sin registrar</span>;
}

function valor(dato: string | number | null | undefined): ReactNode {
  return dato === null || dato === undefined || dato === '' ? (
    <SinRegistrar />
  ) : (
    dato
  );
}

function Fila({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0 sm:block sm:border-b-0 sm:py-0">
      <dt className="text-sm text-slate-600">{etiqueta}</dt>
      <dd className="text-right text-sm font-medium text-slate-900 sm:mt-0.5 sm:text-left">
        {children}
      </dd>
    </div>
  );
}

/**
 * Información general del proyecto: lo que el sistema completa a partir de la asignatura y
 * del período (RF-08, p5). Si faltan créditos u horas, lo advierte sin impedir continuar (p7).
 */
export function InformacionGeneral({
  informacion,
  periodo,
  grupo,
}: {
  informacion: InformacionInstitucional;
  periodo: string | null;
  grupo?: string | null;
}) {
  const requisitos = (lista: InformacionInstitucional['prerrequisitos']) =>
    lista.length === 0
      ? 'Ninguno'
      : lista
          .map((asignatura) =>
            [asignatura.codigo, asignatura.nombre].filter(Boolean).join(' · '),
          )
          .join(', ');

  return (
    <div className="space-y-4">
      {informacion.informacionIncompleta && (
        <Advertencia titulo="Información incompleta">
          <p>
            La asignatura no tiene registrados:{' '}
            {informacion.camposFaltantes.join(', ')}. El proyecto se puede crear
            igual y queda marcado como incompleto hasta que el programa registre
            esos datos.
          </p>
        </Advertencia>
      )}
      <dl className="grid gap-x-6 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-3">
        <Fila etiqueta="Facultad">{valor(informacion.facultad)}</Fila>
        <Fila etiqueta="Programa">{valor(informacion.programa)}</Fila>
        <Fila etiqueta="Plan de estudios">
          {valor(informacion.planEstudio)}
        </Fila>
        <Fila etiqueta="Asignatura">{valor(informacion.asignatura)}</Fila>
        <Fila etiqueta="Código">{valor(informacion.codigo)}</Fila>
        <Fila etiqueta="Semestre">{valor(informacion.semestre)}</Fila>
        <Fila etiqueta="Componente">{valor(informacion.componente)}</Fila>
        <Fila etiqueta="Tipo de curso">{valor(informacion.tipoCurso)}</Fila>
        <Fila etiqueta="Créditos">{valor(informacion.creditos)}</Fila>
        <Fila etiqueta="Horas TDE">{valor(informacion.horasTde)}</Fila>
        <Fila etiqueta="Horas TDP">{valor(informacion.horasTdp)}</Fila>
        <Fila etiqueta="Horas TI">{valor(informacion.horasTi)}</Fila>
        <Fila etiqueta="Período académico">{valor(periodo)}</Fila>
        {grupo !== undefined && (
          <Fila etiqueta="Grupo">{grupo || 'Único'}</Fila>
        )}
        <Fila etiqueta="Prerrequisitos">
          {requisitos(informacion.prerrequisitos)}
        </Fila>
        <Fila etiqueta="Correquisitos">
          {requisitos(informacion.correquisitos)}
        </Fila>
      </dl>
    </div>
  );
}
