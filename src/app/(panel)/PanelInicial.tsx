'use client';

import Link from 'next/link';
import { useSesion } from '@/sesion/ProveedorSesion';
import { usePermisos } from '@/sesion/permisos';
import { REPORTES, ROL } from './menu';
import { PendientesDocente } from './PendientesDocente';
import { ProyectosDevueltos } from './ProyectosDevueltos';
import { useOpcionesMenu, useReportes } from './useOpcionesMenu';

const LISTA = new Intl.ListFormat('es', { type: 'conjunction' });

/**
 * Panel inicial después de iniciar sesión (RF-01, p4): los roles del usuario, un acceso por
 * cada opción que puede abrir (HU-01-03), las mismas del menú, y, para el docente, los
 * proyectos que le devolvieron con observaciones (RF-18) y sus sesiones vencidas y por vencer
 * (RF-23, p5).
 */
export function PanelInicial() {
  const { sesion } = useSesion();
  const tiene = usePermisos();
  const opciones = useOpcionesMenu();
  const reportes = useReportes();
  if (sesion.estado !== 'autenticado') {
    return null;
  }
  const { id, nombres, roles } = sesion.usuario;

  // `menu.ts` trae una descripción por opción. Dos se ajustan aquí a quien las lee:
  // - «Reportes» nombra solo los reportes que el usuario puede abrir (el Líder RAP no abre el
  //   de cumplimiento);
  // - «Proyectos docentes» dice «a su cargo» al docente; los demás consultan los del programa.
  const descripcionDe = (opcion: (typeof opciones)[number]): string => {
    if (opcion.descripcionSi && tiene(opcion.descripcionSi.permiso)) {
      return opcion.descripcionSi.texto;
    }
    if (opcion.ruta === '/reportes' && reportes.length < REPORTES.length) {
      const titulos = reportes.map((reporte, indice) => {
        const nombre = reporte.etiquetaMenu ?? reporte.etiqueta;
        return indice === 0
          ? nombre
          : nombre.charAt(0).toLowerCase() + nombre.slice(1);
      });
      return `${LISTA.format(titulos)}, con exportación a Excel y PDF.`;
    }
    if (opcion.ruta === '/proyectos-docentes' && !roles.includes(ROL.docente)) {
      return 'Consulte los proyectos docentes del programa.';
    }
    return opcion.descripcion;
  };

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
      {/* Lo propio del docente: los proyectos que le devolvieron y las sesiones de sus cursos. */}
      {roles.includes(ROL.docente) && (
        <>
          <ProyectosDevueltos idUsuario={id} />
          <PendientesDocente />
        </>
      )}
      {opciones.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Su usuario todavía no tiene opciones habilitadas. Comuníquese con el
          administrador de URAP.
        </p>
      ) : (
        <nav aria-label="Accesos" className="grid gap-3 sm:grid-cols-2">
          {opciones.map((opcion) => (
            <Link
              key={opcion.ruta}
              href={opcion.ruta}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
            >
              <span className="block font-semibold text-marca">
                {opcion.etiqueta}
              </span>
              <span className="block text-sm text-slate-600">
                {descripcionDe(opcion)}
              </span>
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
