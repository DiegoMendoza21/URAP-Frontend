import type { Parametro } from '@/api/parametros';

/*
 * Cómo se le presenta cada parámetro al administrador (HU-03-07): su tema, un título y una
 * explicación en lenguaje claro. Qué parámetros existen, su tipo y los valores que admiten los
 * dice el backend; un parámetro que todavía no tenga texto aquí aparece en «Otros» con la
 * descripción que él envía.
 */

export interface TextoParametro {
  titulo: string;
  explicacion: string;
  /** Unidad de un parámetro numérico, en singular y en plural: «día», «días». */
  unidad?: [singular: string, plural: string];
  /** Nombre de un elemento de la lista, para los botones: «estrategia», «tipo de archivo». */
  elemento?: string;
  /** Lo que significa cada posición de un parámetro de sí o no. */
  encendido?: string;
  apagado?: string;
}

interface Tema {
  titulo: string;
  /** Claves del tema, en el orden en que se muestran. */
  parametros: Record<string, TextoParametro>;
}

export const TEMAS: readonly Tema[] = [
  {
    titulo: 'Inicio de sesión',
    parametros: {
      inicio_sesion_intentos_maximos: {
        titulo: 'Intentos fallidos antes de bloquear el acceso',
        explicacion:
          'Cuántas veces seguidas puede equivocarse una persona con su contraseña antes de que el sistema le bloquee el acceso por un tiempo.',
        unidad: ['intento', 'intentos'],
      },
      inicio_sesion_minutos_bloqueo: {
        titulo: 'Duración del bloqueo',
        explicacion:
          'Cuántos minutos debe esperar una persona para volver a intentarlo después de que se bloquea su acceso.',
        unidad: ['minuto', 'minutos'],
      },
    },
  },
  {
    titulo: 'Alertas',
    parametros: {
      alerta_dias_anticipacion: {
        titulo: 'Días de anticipación de la alerta',
        explicacion:
          'Con cuántos días de anticipación se le avisa al docente que una clase está por vencer sin registrar. Con 0, el aviso aparece solo el mismo día de la clase.',
        unidad: ['día', 'días'],
      },
      recordatorio_sesiones_dias: {
        titulo: 'Cada cuántos días se recuerdan las sesiones pendientes',
        explicacion:
          'Cada cuántos días recibe el docente, en un solo aviso, el recordatorio de sus clases vencidas y por vencer sin registrar. El sistema lo revisa todos los días a las 7:00 de la mañana.',
        unidad: ['día', 'días'],
      },
    },
  },
  {
    titulo: 'Archivos y evidencias',
    parametros: {
      archivo_tamano_maximo_mb: {
        titulo: 'Tamaño máximo de cada archivo',
        explicacion:
          'Cuánto puede pesar, como máximo, cada archivo que se carga al sistema: las evidencias y la lista de estudiantes matriculados.',
        unidad: ['MB', 'MB'],
      },
      archivo_tipos_permitidos: {
        titulo: 'Tipos de archivo permitidos',
        explicacion:
          'Los tipos de documento que el sistema recibe, por su extensión. La lista de estudiantes matriculados se carga en Excel: si quita «xlsx», no se podrá cargar.',
        elemento: 'tipo de archivo',
      },
      evidencia_tipos_permitidos: {
        titulo: 'Tipos de archivo de las evidencias',
        explicacion:
          'Los tipos de archivo que se aceptan como evidencia de un RAP. El sistema revisa el contenido de cada evidencia, así que solo puede elegir entre los tipos que sabe comprobar.',
        elemento: 'tipo de archivo',
      },
    },
  },
  {
    titulo: 'Proyecto docente',
    parametros: {
      descripcion_curso_longitud_maxima: {
        titulo: 'Longitud máxima de la descripción del curso',
        explicacion:
          'Cuántos caracteres puede tener, como máximo, la descripción del curso (punto 2 del proyecto docente).',
        unidad: ['carácter', 'caracteres'],
      },
      catalogo_estrategias_ensenanza: {
        titulo: 'Estrategias de enseñanza sugeridas',
        explicacion:
          'Las estrategias de enseñanza del catálogo del Ministerio de Educación Nacional que el sistema le sugiere al docente en el punto 4 del proyecto docente. Van una por renglón, en el orden en que se sugieren.',
        elemento: 'estrategia',
      },
      catalogo_estrategias_aprendizaje: {
        titulo: 'Estrategias de aprendizaje sugeridas',
        explicacion:
          'Las estrategias de aprendizaje del catálogo del Ministerio de Educación Nacional que el sistema le sugiere al docente en el punto 4 del proyecto docente. Van una por renglón, en el orden en que se sugieren.',
        elemento: 'estrategia',
      },
    },
  },
  {
    titulo: 'Revisión',
    parametros: {
      revision_bloquear_autoaprobacion: {
        titulo: 'Impedir que alguien revise su propio proyecto docente',
        explicacion:
          'Sirve para que quien elabora un proyecto docente no sea la misma persona que lo aprueba.',
        encendido:
          'Quien es docente de un proyecto no puede aprobarlo ni devolverlo: lo revisa otra persona del Departamento.',
        apagado:
          'Quien tiene permiso de aprobar puede revisar también los proyectos en los que es docente.',
      },
    },
  },
  {
    titulo: 'Reportes',
    parametros: {
      reporte_exportacion_filas_maxima: {
        titulo: 'Filas máximas de una exportación',
        explicacion:
          'Cuántas filas puede tener, como máximo, un archivo exportado del tablero de seguimiento o de los reportes. Si la consulta trae más, el sistema pide aplicar más filtros.',
        unidad: ['fila', 'filas'],
      },
    },
  },
];

const TEMA_OTROS = 'Otros';

export interface GrupoParametros {
  titulo: string;
  parametros: { parametro: Parametro; texto: TextoParametro }[];
}

/** Los parámetros que envió el backend, agrupados por tema y en el orden de `TEMAS`. */
export function agrupar(parametros: readonly Parametro[]): GrupoParametros[] {
  const porClave = new Map(
    parametros.map((parametro) => [parametro.clave, parametro]),
  );
  const conocidas = new Set<string>();
  const grupos: GrupoParametros[] = [];
  for (const tema of TEMAS) {
    const delTema = Object.entries(tema.parametros).flatMap(
      ([clave, texto]) => {
        const parametro = porClave.get(clave);
        conocidas.add(clave);
        return parametro ? [{ parametro, texto }] : [];
      },
    );
    if (delTema.length > 0) {
      grupos.push({ titulo: tema.titulo, parametros: delTema });
    }
  }
  const otros = parametros
    .filter((parametro) => !conocidas.has(parametro.clave))
    .map((parametro) => ({
      parametro,
      texto: {
        titulo: parametro.clave,
        explicacion: parametro.descripcion ?? '',
      },
    }));
  if (otros.length > 0) {
    grupos.push({ titulo: TEMA_OTROS, parametros: otros });
  }
  return grupos;
}

const numero = new Intl.NumberFormat('es-CO');

/** «5 intentos», «1 día», «4.000 caracteres». Si el valor no es un número, tal como está. */
export function valorConUnidad(valor: string, texto: TextoParametro): string {
  if (!/^\d+$/.test(valor)) {
    return valor;
  }
  const cantidad = Number(valor);
  const unidad = texto.unidad?.[cantidad === 1 ? 0 : 1];
  return `${numero.format(cantidad)}${unidad ? ` ${unidad}` : ''}`;
}

export function formatoNumero(valor: number): string {
  return numero.format(valor);
}
