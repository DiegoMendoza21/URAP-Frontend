import { EstadoServidor } from '@/componentes/EstadoServidor';
import { NOMBRE_APLICACION } from './identidad';

export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-8 px-4 py-12 sm:px-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-marca uppercase">
          Universidad de Cartagena
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          {NOMBRE_APLICACION}
        </h1>
        <p className="text-lg text-slate-700">
          Seguimiento, control y análisis de los proyectos docentes del programa
          de Administración Industrial.
        </p>
      </header>
      <EstadoServidor />
    </main>
  );
}
