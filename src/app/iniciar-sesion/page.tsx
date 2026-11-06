import type { Metadata } from 'next';
import { EstadoServidor } from '@/componentes/EstadoServidor';
import { NOMBRE_APLICACION } from '../identidad';
import { FormularioInicioSesion } from './FormularioInicioSesion';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function PaginaInicioSesion() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-wide text-marca uppercase">
          Universidad de Cartagena
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          {NOMBRE_APLICACION}
        </h1>
        <p className="text-slate-700">
          Seguimiento de los proyectos docentes del programa de Administración
          Industrial.
        </p>
      </header>
      <FormularioInicioSesion />
      <EstadoServidor />
    </main>
  );
}
