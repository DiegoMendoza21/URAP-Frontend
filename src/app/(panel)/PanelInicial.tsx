'use client';

import Link from 'next/link';
import { useSesion } from '@/sesion/ProveedorSesion';
import { PendientesDocente } from './PendientesDocente';

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

/**
 * Panel inicial después de iniciar sesión (RF-01, p4). El menú completo según los roles llega
 * con HU-01-03; por ahora, el acceso a los proyectos docentes y, para el docente, sus sesiones
 * vencidas y por vencer (RF-23, p5).
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
      {roles.includes('Docente responsable') && <PendientesDocente />}
      {roles.some((rol) => ROLES_PROYECTOS.includes(rol)) && (
        <nav aria-label="Accesos" className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/proyectos-docentes"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
          >
            <span className="block font-semibold text-marca">
              Proyectos docentes
            </span>
            <span className="block text-sm text-slate-600">
              {roles.includes('Departamento académico')
                ? 'Cree los proyectos del período y asigne los docentes.'
                : 'Consulte los proyectos docentes a su cargo.'}
            </span>
          </Link>
        </nav>
      )}
    </section>
  );
}
