import 'server-only';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ruta pública del logo de la Universidad de Cartagena (NFR-018), o `null` si todavía no se ha
 * puesto el archivo. Basta con copiar `logo-universidad.svg` o `logo-universidad.png` en
 * `public/marca/` y volver a construir: sin el archivo, la interfaz no muestra nada en su lugar,
 * ni una imagen rota ni una petición que falle.
 */
export function rutaLogoUniversidad(): string | null {
  for (const extension of ['svg', 'png']) {
    const archivo = `logo-universidad.${extension}`;
    if (existsSync(join(process.cwd(), 'public', 'marca', archivo))) {
      return `/marca/${archivo}`;
    }
  }
  return null;
}
