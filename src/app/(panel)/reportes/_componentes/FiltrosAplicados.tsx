/**
 * HU-12-06: los filtros con que se generó el reporte, en palabras. Solo se ven al imprimir:
 * en pantalla están los selectores, pero en el PDF se ocultan, y sin esta línea un reporte
 * filtrado parecería el total del período. El Excel lleva la misma línea (backend).
 */
export function FiltrosAplicados({
  partes,
}: {
  /** Etiqueta y valor de cada filtro; los que no se usaron llegan sin valor. */
  partes: readonly (readonly [etiqueta: string, valor: string | undefined])[];
}) {
  const usados = partes.filter(([, valor]) => valor);
  return (
    <p className="hidden text-sm text-slate-700 print:block">
      Filtros:{' '}
      {usados.length === 0
        ? 'ninguno (todo el período)'
        : usados
            .map(([etiqueta, valor]) => `${etiqueta}: ${valor}`)
            .join(' · ')}
    </p>
  );
}

/** El nombre de la opción elegida en un selector, o nada si no se eligió. */
export function nombreDe(
  opciones: readonly { id: number; nombre: string }[],
  id: number | undefined,
): string | undefined {
  return id === undefined
    ? undefined
    : opciones.find((opcion) => opcion.id === id)?.nombre;
}

/** El RAP elegido en los reportes que filtran por RAP (logro y contribución). */
export function rapDe(
  programas: readonly {
    raps: readonly {
      id: number;
      codigo: string | null;
      numero: number | null;
    }[];
  }[],
  idRap: number | undefined,
): string | undefined {
  if (idRap === undefined) {
    return undefined;
  }
  const rap = programas
    .flatMap((programa) => programa.raps)
    .find((opcion) => opcion.id === idRap);
  return rap ? (rap.codigo ?? `RAP ${rap.numero ?? ''}`) : undefined;
}
