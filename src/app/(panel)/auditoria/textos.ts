import type { AccionAuditoria, RegistroAuditoria } from '@/api/auditoria';

/*
 * La auditoría guarda códigos del modelo de datos (`proyecto_docente`, `fechaEnvio`). Aquí se
 * traducen a palabras del dominio para que el Administrador lea «aprobó el proyecto docente»
 * y no nombres de tablas. Lo que no esté en estas listas se muestra con el código convertido
 * en palabras, para que una entidad o un campo nuevo no deje la pantalla en blanco.
 */

/** Permiso de la matriz que abre la consulta completa: en la matriz inicial, el Administrador. */
export const PERMISO_AUDITORIA = 'auditoria.administrar';

export const ACCIONES: Record<
  AccionAuditoria,
  { nombre: string; verbo: string }
> = {
  crear: { nombre: 'Creación', verbo: 'creó' },
  actualizar: { nombre: 'Modificación', verbo: 'modificó' },
  eliminar: { nombre: 'Eliminación', verbo: 'eliminó' },
  aprobar: { nombre: 'Aprobación', verbo: 'aprobó' },
  consulta_sensible: { nombre: 'Consulta sensible', verbo: 'consultó' },
};

/** Color de la insignia de cada acción. El nombre de la acción siempre va escrito. */
export const TONO_ACCION: Record<
  AccionAuditoria,
  'neutro' | 'marca' | 'advertencia' | 'peligro' | 'informativo'
> = {
  crear: 'neutro',
  actualizar: 'advertencia',
  eliminar: 'peligro',
  aprobar: 'marca',
  consulta_sensible: 'informativo',
};

interface Entidad {
  /** Para los filtros y los títulos: «Proyecto docente». */
  nombre: string;
  /** Dentro de una frase: «el proyecto docente». */
  enFrase: string;
  /** Pantalla del registro, si el Administrador puede abrirla. */
  ruta?: (id: number) => string;
}

/**
 * Entidades que hoy se auditan. El identificador de algunas es el de su contenedor: las
 * inasistencias y el registro de la clase llevan el de la sesión de clase, y la lista de
 * matriculados, el del proyecto docente.
 */
export const ENTIDADES: Record<string, Entidad> = {
  proyecto_docente: {
    nombre: 'Proyecto docente',
    enFrase: 'el proyecto docente',
    ruta: (id) => `/proyectos-docentes/${id}`,
  },
  rac: {
    nombre: 'Resultado de aprendizaje del curso (RAC)',
    enFrase: 'el RAC',
  },
  observacion_revision: {
    nombre: 'Observación de revisión',
    enFrase: 'la observación de revisión',
  },
  sesion_clase: {
    nombre: 'Registro de clase',
    enFrase: 'el registro de la clase',
  },
  inasistencia: {
    nombre: 'Inasistencias',
    enFrase: 'las inasistencias de la clase',
  },
  matricula: {
    nombre: 'Lista de matriculados',
    enFrase: 'la lista de matriculados del proyecto docente',
    ruta: (id) => `/proyectos-docentes/${id}/matriculados`,
  },
  evidencia_rap: { nombre: 'Evidencia', enFrase: 'la evidencia' },
  medicion_rap: {
    nombre: 'Medición de RAP',
    enFrase: 'la medición de RAP',
    ruta: (id) => `/mediciones/${id}`,
  },
  reporte_academico: {
    nombre: 'Reporte académico',
    enFrase: 'el reporte académico',
  },
  programa: {
    nombre: 'Reportes del programa',
    enFrase: 'los reportes del programa',
  },
  rol: { nombre: 'Rol', enFrase: 'el rol' },
  usuario: { nombre: 'Usuario', enFrase: 'el usuario' },
  sesion: { nombre: 'Sesión de usuario', enFrase: 'la sesión de usuario' },
  parametro_sistema: {
    nombre: 'Parámetro del sistema',
    enFrase: 'el parámetro del sistema',
  },
  auditoria: { nombre: 'Auditoría', enFrase: 'la auditoría' },
};

/** Acciones que se dicen mejor con su propia frase que con «verbo + entidad». */
const FRASES: Record<string, string> = {
  'crear:sesion': 'inició sesión',
  'actualizar:sesion': 'cerró sesión',
  'actualizar:sesion_clase': 'registró la clase',
  'crear:reporte_academico': 'generó el reporte académico',
  'actualizar:matricula': 'cargó la lista de matriculados del proyecto docente',
};

const CAMPOS: Record<string, string> = {
  activo: 'Activo',
  agregados: 'Permisos agregados',
  ausentes: 'Estudiantes ausentes',
  bloqueado_hasta: 'Bloqueado hasta',
  calendario: 'Calendario de sesiones',
  clave: 'Archivo',
  descripcion: 'Descripción',
  dia: 'Día',
  desmarcados: 'Ausencias retiradas',
  docentes: 'Docentes',
  emitida_en: 'Inicio de la sesión',
  estado: 'Estado',
  expira_en: 'Vencimiento de la sesión',
  fechaAprobacion: 'Fecha de aprobación',
  fechaEnvio: 'Fecha de envío',
  horaFin: 'Hora de fin',
  horaInicio: 'Hora de inicio',
  horario: 'Horario',
  idAsignatura: 'Asignatura (identificador)',
  idPeriodo: 'Período (identificador)',
  idProyectoDocente: 'Proyecto docente (identificador)',
  idRap: 'RAP (identificador)',
  idSesion: 'Sesión de clase (identificador)',
  idsRap: 'RAP (identificadores)',
  id_usuario: 'Usuario (identificador)',
  intentos_fallidos: 'Intentos fallidos',
  marcados: 'Ausencias marcadas',
  motivo: 'Motivo',
  motivo_revocacion: 'Motivo del cierre',
  nombre: 'Nombre',
  observaciones: 'Observaciones',
  parametros: 'Parámetros',
  password_hash: 'Contraseña',
  permisos: 'Permisos',
  resuelta: 'Resuelta',
  retirados: 'Permisos retirados',
  revocada_en: 'Cierre de la sesión',
  secciones: 'Secciones',
  tamanoBytes: 'Tamaño (bytes)',
  temas: 'Temas desarrollados (identificadores)',
  tipo: 'Tipo',
  valor: 'Valor',
};

/** `fecha_envio` o `fechaEnvio` → «Fecha envio»: el código en palabras, sin inventar tildes. */
function enPalabras(codigo: string): string {
  const palabras = codigo
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return palabras ? palabras[0].toUpperCase() + palabras.slice(1) : codigo;
}

export function nombreAccion(accion: string): string {
  return ACCIONES[accion as AccionAuditoria]?.nombre ?? enPalabras(accion);
}

export function nombreEntidad(entidad: string): string {
  return ENTIDADES[entidad]?.nombre ?? enPalabras(entidad);
}

export function nombreCampo(campo: string): string {
  return CAMPOS[campo] ?? enPalabras(campo);
}

/**
 * «Proyecto docente n.º 12», o solo «Proyecto docente» si la acción no recae sobre uno. Con
 * número se usa la frase de la entidad, que dice de quién es el número: «Lista de matriculados
 * del proyecto docente n.º 3».
 */
export function sobreQue(entidad: string, idRegistro: number | null): string {
  if (idRegistro === null) {
    return nombreEntidad(entidad);
  }
  const frase = ENTIDADES[entidad]?.enFrase.replace(/^(el|la|los|las) /, '');
  const nombre = frase
    ? frase[0].toUpperCase() + frase.slice(1)
    : nombreEntidad(entidad);
  return `${nombre} n.º ${idRegistro}`;
}

/** Quién hizo la acción. Sin usuario, la hizo el sistema (un bloqueo automático, por ejemplo). */
export function quien(registro: Pick<RegistroAuditoria, 'usuario'>): string {
  return registro.usuario?.nombre || 'El sistema';
}

/** Qué hizo y sobre qué, para completar «Fulano …»: «aprobó el proyecto docente n.º 12». */
export function queHizo(
  registro: Pick<RegistroAuditoria, 'accion' | 'entidad' | 'idRegistro'>,
): string {
  const { accion, entidad, idRegistro } = registro;
  const numero = idRegistro === null ? '' : ` n.º ${idRegistro}`;
  const frase = FRASES[`${accion}:${entidad}`];
  if (frase) {
    // «inició sesión» no lleva número: el de la sesión no le dice nada a quien lee.
    return entidad === 'sesion' ? frase : `${frase}${numero}`;
  }
  const verbo =
    ACCIONES[accion]?.verbo ??
    `hizo «${enPalabras(accion).toLowerCase()}» sobre`;
  const objeto =
    ENTIDADES[entidad]?.enFrase ?? `«${enPalabras(entidad).toLowerCase()}»`;
  return `${verbo} ${objeto}${numero}`;
}

/** Pantalla del registro afectado, si existe una y la acción recae sobre un registro. */
export function rutaDelRegistro(
  entidad: string,
  idRegistro: number | null,
): string | null {
  return idRegistro === null
    ? null
    : (ENTIDADES[entidad]?.ruta?.(idRegistro) ?? null);
}

const formatoMomento = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});
const formatoMomentoConSegundos = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'medium',
  timeZone: 'America/Bogota',
});

/** Cuándo, en la hora de Colombia: «10 nov 2026, 3:04 p. m.». */
export function cuando(fecha: string | null, conSegundos = false): string {
  if (!fecha) {
    return 'Sin fecha';
  }
  return (conSegundos ? formatoMomentoConSegundos : formatoMomento).format(
    new Date(fecha),
  );
}

const PATRON_INSTANTE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
/** Códigos como `enviado` o `en_diligenciamiento`: se leen mejor como palabras. */
const PATRON_CODIGO = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
/** Lo que el backend pone en lugar de una contraseña, un token o un texto reservado. */
const VALOR_OMITIDO = '[omitido]';

/**
 * Un valor guardado, como texto para leer. Las listas y los objetos van en varias líneas, una
 * por elemento, con los nombres de sus campos también traducidos.
 */
export function textoDeValor(valor: unknown, sangria = ''): string {
  if (valor === null || valor === undefined) {
    return 'Sin valor';
  }
  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No';
  }
  if (typeof valor === 'string') {
    if (valor === VALOR_OMITIDO) {
      return 'Oculto por seguridad';
    }
    if (valor === '') {
      return 'Vacío';
    }
    if (PATRON_INSTANTE.test(valor)) {
      return cuando(valor);
    }
    return PATRON_CODIGO.test(valor) ? enPalabras(valor) : valor;
  }
  if (typeof valor !== 'object') {
    return String(valor);
  }
  if (Array.isArray(valor)) {
    if (valor.length === 0) {
      return 'Ninguno';
    }
    if (valor.every((elemento) => typeof elemento !== 'object')) {
      return valor.map((elemento) => textoDeValor(elemento)).join(', ');
    }
    return valor
      .map(
        (elemento) => `${sangria}• ${textoDeValor(elemento, `${sangria}  `)}`,
      )
      .join('\n');
  }
  const campos = Object.entries(valor);
  if (campos.length === 0) {
    return 'Vacío';
  }
  return campos
    .map(
      ([campo, interno]) =>
        `${nombreCampo(campo)}: ${textoDeValor(interno, `${sangria}  `)}`,
    )
    .join(`\n${sangria}`);
}

export interface CampoComparado {
  campo: string;
  nombre: string;
  /** `undefined`: el campo no está en ese lado. */
  anterior: string | undefined;
  nuevo: string | undefined;
  cambio: boolean;
}

/**
 * El valor anterior y el nuevo, campo por campo (HU-14-03). `cambio` marca los campos cuyo
 * valor es distinto en los dos lados o que solo están en uno.
 */
export function compararValores(
  anterior: Record<string, unknown> | null,
  nuevo: Record<string, unknown> | null,
): CampoComparado[] {
  const campos = [
    ...new Set([...Object.keys(anterior ?? {}), ...Object.keys(nuevo ?? {})]),
  ];
  return campos.map((campo) => {
    const enAnterior = anterior !== null && campo in anterior;
    const enNuevo = nuevo !== null && campo in nuevo;
    return {
      campo,
      nombre: nombreCampo(campo),
      anterior: enAnterior ? textoDeValor(anterior[campo]) : undefined,
      nuevo: enNuevo ? textoDeValor(nuevo[campo]) : undefined,
      cambio:
        !enAnterior ||
        !enNuevo ||
        JSON.stringify(anterior[campo]) !== JSON.stringify(nuevo[campo]),
    };
  });
}
