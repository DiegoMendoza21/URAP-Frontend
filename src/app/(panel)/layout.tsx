import { RequiereSesion } from '@/sesion/RequiereSesion';
import { EncabezadoPanel } from './EncabezadoPanel';

/**
 * Pantallas que exigen sesión. Se muestran cuando el navegador confirma la sesión, así que
 * Next no alcanza a prerenderizar sus páginas: cada página de esta carpeta exporta
 * `instant = false` para que el modo de desarrollo no lo reporte como un problema de
 * navegación (https://nextjs.org/docs/messages/instant-unrendered-segment).
 */
export default function DisenoPanel({ children }: LayoutProps<'/'>) {
  return (
    <RequiereSesion>
      <EncabezadoPanel />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </RequiereSesion>
  );
}
