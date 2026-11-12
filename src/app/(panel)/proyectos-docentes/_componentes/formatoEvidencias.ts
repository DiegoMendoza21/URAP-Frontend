/* Formatos de la pantalla de evidencias. */

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** «lun, 14 sept 2026» a partir de «2026-09-14». */
export function formatoFecha(fecha: string): string {
  return FECHA_CORTA.format(new Date(`${fecha}T00:00:00.000Z`));
}

/** «350 KB» o «2,4 MB». */
export function formatoTamano(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('es-CO', {
    maximumFractionDigits: 1,
  })} MB`;
}

/** «JPG, PNG o PDF», con las extensiones que permite el backend (sin repetir JPEG). */
export function tiposLegibles(extensiones: readonly string[]): string {
  const nombres = [
    ...new Set(
      extensiones.map((extension) =>
        (extension === 'jpeg' ? 'jpg' : extension).toUpperCase(),
      ),
    ),
  ];
  return nombres.length <= 1
    ? (nombres[0] ?? '')
    : `${nombres.slice(0, -1).join(', ')} o ${nombres.at(-1)}`;
}

/**
 * Revisión previa de un archivo con los límites que da el backend. Solo ahorra una subida
 * inútil: quien decide es el backend, que mira el contenido del archivo (RF-24, p4).
 */
export function problemaDelArchivo(
  archivo: File,
  limites: {
    tamanoMaximoMb: number;
    extensionesPermitidas: readonly string[];
    tiposMimePermitidos: readonly string[];
  },
): string | null {
  const extension = /\.([a-z0-9]+)$/i.exec(archivo.name)?.[1]?.toLowerCase();
  const tipoPermitido =
    limites.tiposMimePermitidos.includes(archivo.type) ||
    (extension !== undefined &&
      limites.extensionesPermitidas.includes(extension));
  if (!tipoPermitido) {
    return `«${archivo.name}» no es de un tipo permitido. Puede cargar archivos ${tiposLegibles(limites.extensionesPermitidas)}.`;
  }
  if (archivo.size > limites.tamanoMaximoMb * 1024 * 1024) {
    return `«${archivo.name}» pesa ${formatoTamano(archivo.size)} y cada archivo puede pesar hasta ${limites.tamanoMaximoMb} MB.`;
  }
  return null;
}
