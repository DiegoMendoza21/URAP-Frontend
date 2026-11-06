import type { Metadata, Viewport } from 'next';
import {
  COLOR_MARCA,
  DESCRIPCION_APLICACION,
  NOMBRE_APLICACION,
} from './identidad';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: NOMBRE_APLICACION,
    template: `%s · ${NOMBRE_APLICACION}`,
  },
  description: DESCRIPCION_APLICACION,
  applicationName: NOMBRE_APLICACION,
};

export const viewport: Viewport = {
  themeColor: COLOR_MARCA,
};

export default function DisenoRaiz({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-CO">
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
