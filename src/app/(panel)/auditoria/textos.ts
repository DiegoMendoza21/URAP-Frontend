import type {
  AccionAuditoria,
  EventoAuditoria,
  RegistroAuditoria,
} from '@/api/auditoria';

/*
 * La auditoría guarda códigos del modelo de datos (`proyecto_docente`, `fechaEnvio`). Aquí se
 * traducen a palabras del dominio para que el Administrador lea «aprobó el proyecto docente»
 * y no nombres de tablas. Lo que no esté en estas listas se muestra con el código convertido
 * en palabras, para que una entidad o un campo nuevo no deje la pantalla en blanco.
 */

/** Permiso de la matriz que abre la consulta completa: en la matriz inicial, el Administrador. */
export const PERMISO_AUDITORIA = 'auditoria.administrar';

type Tono = 'neutro' | 'marca' | 'advertencia' | 'peligro' | 'informativo';

interface Evento {
  /** La etiqueta del registro y la opción del filtro «Acción»: «Inicio de sesión». */
  nombre: string;
  /** Color de la insignia. El nombre siempre va escrito. */
  tono: Tono;
  /** Para completar «Fulano …» cuando «verbo + entidad» no lo dice bien: «inició sesión». */
  frase?: string;
  /** El número del registro no le dice nada a quien lee (el de la sesión, el de la asignación). */
  sinNumero?: true;
}

/**
 * Lo que pasó, con palabras del dominio. La auditoría guarda un inicio de sesión como la
 * creación de una fila de `sesion` y una devolución como un cambio de `estado`; el backend
 * los entrega ya nombrados (`evento`), y aquí está cómo se leen. Los cinco primeros son los
 * generales: lo que no tiene nombre propio.
 */
export const EVENTOS: Record<EventoAuditoria, Evento> = {
  creacion: { nombre: 'Creación', tono: 'neutro' },
  modificacion: { nombre: 'Modificación', tono: 'advertencia' },
  eliminacion: { nombre: 'Eliminación', tono: 'peligro' },
  aprobacion: { nombre: 'Aprobación', tono: 'marca' },
  consulta_sensible: { nombre: 'Consulta sensible', tono: 'informativo' },
  inicio_sesion: {
    nombre: 'Inicio de sesión',
    tono: 'neutro',
    frase: 'inició sesión',
    sinNumero: true,
  },
  cierre_sesion: {
    nombre: 'Cierre de sesión',
    tono: 'neutro',
    frase: 'cerró sesión',
    sinNumero: true,
  },
  envio_revision: {
    nombre: 'Envío a revisión',
    tono: 'informativo',
    frase: 'envió a revisión el proyecto docente',
  },
  devolucion: {
    nombre: 'Devolución',
    tono: 'advertencia',
    frase: 'devolvió el proyecto docente',
  },
  registro_clase: {
    nombre: 'Registro de clase',
    tono: 'neutro',
    frase: 'registró la clase',
  },
  registro_inasistencias: {
    nombre: 'Registro de inasistencias',
    tono: 'neutro',
    frase: 'registró las inasistencias de la clase',
  },
  carga_matriculados: {
    nombre: 'Carga de matriculados',
    tono: 'neutro',
    frase: 'cargó la lista de matriculados del proyecto docente',
  },
  carga_evidencia: {
    nombre: 'Carga de evidencia',
    tono: 'neutro',
    frase: 'subió la evidencia',
  },
  generacion_reporte: {
    nombre: 'Generación de reporte',
    tono: 'neutro',
    frase: 'generó el reporte académico',
  },
  cierre_medicion: {
    nombre: 'Cierre de medición',
    tono: 'marca',
    frase: 'cerró la medición de RAP',
  },
  reapertura_medicion: {
    nombre: 'Reapertura de medición',
    tono: 'advertencia',
    frase: 'reabrió la medición de RAP',
  },
  bloqueo_usuario: {
    nombre: 'Bloqueo de usuario',
    tono: 'peligro',
    frase: 'bloqueó por intentos fallidos al usuario',
  },
  inactivacion_usuario: {
    nombre: 'Inactivación de usuario',
    tono: 'peligro',
    frase: 'inactivó al usuario',
  },
  reactivacion_usuario: {
    nombre: 'Reactivación de usuario',
    tono: 'neutro',
    frase: 'reactivó al usuario',
  },
  restablecimiento_contrasena: {
    nombre: 'Contraseña nueva',
    tono: 'advertencia',
    frase: 'generó una contraseña nueva para el usuario',
  },
  asignacion_rol: {
    nombre: 'Asignación de rol',
    tono: 'neutro',
    frase: 'asignó un rol a un usuario',
    sinNumero: true,
  },
  revocacion_rol: {
    nombre: 'Revocación de rol',
    tono: 'advertencia',
    frase: 'revocó un rol de un usuario',
    sinNumero: true,
  },
};

/** Para los eventos generales, que se dicen con «verbo + entidad»: «creó el rol n.º 4». */
const VERBOS: Record<AccionAuditoria, string> = {
  crear: 'creó',
  actualizar: 'modificó',
  eliminar: 'eliminó',
  aprobar: 'aprobó',
  consulta_sensible: 'consultó',
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
  // HU-10-04: la consulta del Líder RAP lleva el id del RAP, no el de una evidencia.
  rap: { nombre: 'Evidencias de un RAP', enFrase: 'las evidencias del RAP' },
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
  usuario_rol: { nombre: 'Rol de un usuario', enFrase: 'el rol de un usuario' },
  sesion: { nombre: 'Sesión de usuario', enFrase: 'la sesión de usuario' },
  parametro_sistema: {
    nombre: 'Parámetro del sistema',
    enFrase: 'el parámetro del sistema',
  },
  auditoria: { nombre: 'Auditoría', enFrase: 'la auditoría' },
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

/** La etiqueta de lo que pasó. Un evento que esta pantalla aún no conoce sale con su código en palabras. */
export function nombreEvento(evento: string): string {
  return EVENTOS[evento as EventoAuditoria]?.nombre ?? enPalabras(evento);
}

export function tonoEvento(evento: string): Tono {
  return EVENTOS[evento as EventoAuditoria]?.tono ?? 'neutro';
}

/** Las opciones del filtro «Acción»: las mismas palabras de las etiquetas, en orden alfabético. */
export function opcionesDeEvento(): {
  codigo: EventoAuditoria;
  nombre: string;
}[] {
  return (Object.keys(EVENTOS) as EventoAuditoria[])
    .map((codigo) => ({ codigo, nombre: EVENTOS[codigo].nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
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
  registro: Pick<
    RegistroAuditoria,
    'accion' | 'evento' | 'entidad' | 'idRegistro'
  >,
): string {
  const { accion, entidad, idRegistro } = registro;
  const numero = idRegistro === null ? '' : ` n.º ${idRegistro}`;
  const propio = EVENTOS[registro.evento];
  if (propio?.frase) {
    return propio.sinNumero ? propio.frase : `${propio.frase}${numero}`;
  }
  const verbo =
    VERBOS[accion] ?? `hizo «${enPalabras(accion).toLowerCase()}» sobre`;
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
