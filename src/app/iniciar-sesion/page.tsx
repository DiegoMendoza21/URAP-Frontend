import type { Metadata } from 'next';
import Image from 'next/image';
import { EstadoServidor } from '@/componentes/EstadoServidor';
import { LogoUniversidad } from '@/componentes/LogoUniversidad';
import { NOMBRE_APLICACION } from '../identidad';
import { FormularioInicioSesion } from './FormularioInicioSesion';

export const metadata: Metadata = { title: 'Iniciar sesión' };

/**
 * En el computador, la marca en un panel negro a la izquierda y el formulario a la derecha; en
 * el teléfono, apilados. El escudo de la Universidad va sobre el fondo claro, junto al formulario.
 */
export default function PaginaInicioSesion() {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <section className="flex flex-col justify-center border-b-4 border-acento bg-negro px-6 py-10 text-white lg:border-r-4 lg:border-b-0 lg:px-16">
        <header className="mx-auto w-full max-w-md space-y-4">
          <p className="text-sm font-semibold tracking-wide text-acento uppercase">
            Universidad de Cartagena
          </p>
          <h1>
            <Image
              src="/marca/urap-logo-oscuro.svg"
              alt={NOMBRE_APLICACION}
              width={202}
              height={64}
              unoptimized
              className="h-16 w-auto lg:h-24"
            />
          </h1>
          <p className="text-slate-200 lg:text-lg">
            Seguimiento de los proyectos docentes del programa de Administración
            Industrial.
          </p>
        </header>
      </section>
      <section className="flex flex-col justify-center px-4 py-8 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-6">
          <LogoUniversidad alto={64} className="mx-auto" />
          <FormularioInicioSesion />
          <EstadoServidor />
        </div>
      </section>
    </main>
  );
}
