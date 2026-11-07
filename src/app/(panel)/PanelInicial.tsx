'use client';

import Link from 'next/link';
import { useSesion } from '@/sesion/ProveedorSesion';

/**
 * Roles que consultan proyectos docentes; el backend filtra cuáles ve cada uno. El Estudiante
 * solo verá los publicados, con RF-27.
 */
const ROLES_PROYECTOS = [
  'Administrador',
  'Departamento académico',
  'Docente responsable',
  'Líder RAP',
  'Dirección del programa',
];

/** Roles que abren mediciones de RAP (RF-30, RF-31); el backend filtra cuáles ve cada uno. */
const ROLES_MEDICION = [
  'Docente responsable',
  'Líder RAP',
  'Departamento académico',
];

/** Roles que consultan el reporte de logro de los RAP (RF-32, matriz de permisos). */
const ROLES_REPORTE_LOGRO = [
  'Administrador',
  'Departamento académico',
  'Dirección del programa',
  'Líder RAP',
];

const CLASE_ACCESO =
  'block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca';

/**
 * Panel inicial después de iniciar sesión (RF-01, p4). El menú completo según los roles llega
 * con HU-01-03; por ahora, el acceso a los proyectos docentes.
 */
export function PanelInicial() {
  const { sesion } = useSesion();
  if (sesion.estado !== 'autenticado') {
    return null;
  }
  const { nombres, roles } = sesion.usuario;

  return (
    <section aria-labelledby="titulo-panel" className="space-y-6">
      <h1 id="titulo-panel" className="text-2xl font-bold sm:text-3xl">
        {nombres ? `Hola, ${nombres}` : 'Hola'}
      </h1>
      <div>
        <h2 className="text-sm font-semibold text-slate-600">Sus roles</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {roles.map((rol) => (
            <li
              key={rol}
              className="rounded-full bg-marca/10 px-3 py-1 text-sm font-medium text-marca"
            >
              {rol}
            </li>
          ))}
        </ul>
      </div>
      {roles.some((rol) => ROLES_PROYECTOS.includes(rol)) && (
        <nav aria-label="Accesos" className="grid gap-3 sm:grid-cols-2">
          <Link href="/proyectos-docentes" className={CLASE_ACCESO}>
            <span className="block font-semibold text-marca">
              Proyectos docentes
            </span>
            <span className="block text-sm text-slate-600">
              {roles.includes('Departamento académico')
                ? 'Cree los proyectos del período y asigne los docentes.'
                : 'Consulte los proyectos docentes a su cargo.'}
            </span>
          </Link>
          {roles.some((rol) => ROLES_MEDICION.includes(rol)) && (
            <Link href="/mediciones" className={CLASE_ACCESO}>
              <span className="block font-semibold text-marca">
                Medición de RAP
              </span>
              <span className="block text-sm text-slate-600">
                Valoraciones, consolidado y acciones de mejora de cada curso.
              </span>
            </Link>
          )}
          {roles.some((rol) => ROLES_REPORTE_LOGRO.includes(rol)) && (
            <Link href="/reportes/logro-rap" className={CLASE_ACCESO}>
              <span className="block font-semibold text-marca">
                Reporte de logro de los RAP
              </span>
              <span className="block text-sm text-slate-600">
                Porcentaje alcanzado por RAP frente al esperado, con exportación
                a Excel y PDF.
              </span>
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
