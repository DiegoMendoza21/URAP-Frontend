import type { PreparacionDuplicado } from '@/api/proyectos-docentes';

/** «1 semana», «3 semanas». */
export function cantidad(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export interface LineaDeContenido {
  /** El punto del formato FO-DO/PC-001 que los docentes ya conocen. */
  punto: number;
  nombre: string;
  detalle: string;
  /** El origen no tiene nada en ese punto: la copia lo trae vacío. */
  vacio: boolean;
}

/** Los puntos 2 a 7 del origen, con lo que la copia va a llevar de cada uno (RF-09, p3). */
export function lineasDeContenido(
  contenido: PreparacionDuplicado['contenido'],
): LineaDeContenido[] {
  const vacia = (punto: number, nombre: string): LineaDeContenido => ({
    punto,
    nombre,
    detalle: 'Sin diligenciar en el origen',
    vacio: true,
  });
  const linea = (
    punto: number,
    nombre: string,
    n: number,
    detalle: string,
  ): LineaDeContenido =>
    n === 0 ? vacia(punto, nombre) : { punto, nombre, detalle, vacio: false };

  return [
    contenido.descripcion
      ? { punto: 2, nombre: 'Descripción', detalle: 'Escrita', vacio: false }
      : vacia(2, 'Descripción'),
    linea(
      3,
      'RAC',
      contenido.racs,
      `${cantidad(contenido.racs, 'RAC', 'RAC')}, ${cantidad(contenido.relacionesRap, 'relación', 'relaciones')} con los RAP`,
    ),
    linea(
      4,
      'Estrategias',
      contenido.estrategias,
      cantidad(contenido.estrategias, 'estrategia', 'estrategias'),
    ),
    linea(
      5,
      'Evaluación',
      contenido.actividadesEvaluacion,
      cantidad(contenido.actividadesEvaluacion, 'actividad', 'actividades'),
    ),
    linea(
      6,
      'Contenidos',
      contenido.semanasContenido,
      cantidad(contenido.semanasContenido, 'semana', 'semanas'),
    ),
    linea(
      7,
      'Bibliografía',
      contenido.referencias,
      cantidad(contenido.referencias, 'referencia', 'referencias'),
    ),
  ];
}
