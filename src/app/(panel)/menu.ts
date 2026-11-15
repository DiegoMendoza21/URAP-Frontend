import type { ClavePermiso } from '@/sesion/permisos';

/** Nombres de los roles del sistema (RF-03), tal como los envía el backend. */
export const ROL = {
  administrador: 'Administrador',
  departamento: 'Departamento académico',
  direccion: 'Dirección del programa',
  docente: 'Docente responsable',
  liderRap: 'Líder RAP',
} as const;

type NombreRol = (typeof ROL)[keyof typeof ROL];

/**
 * Quién ve una opción. Lo normal es un permiso de la matriz (HU-01-03), que también funciona
 * con los roles que cree el administrador. Los roles solo se usan cuando el backend protege
 * esas pantallas con `@Roles`, porque la matriz no expresa la regla: así el menú muestra lo
 * mismo que el backend deja abrir.
 */
type Acceso =
  | { permiso: ClavePermiso; roles?: never }
  | { roles: readonly NombreRol[]; permiso?: never };

export type OpcionMenu = Acceso & {
  ruta: string;
  /** Título de la tarjeta del panel inicial. */
  etiqueta: string;
  /** Nombre corto para el menú, si `etiqueta` es larga para el teléfono. */
  etiquetaMenu?: string;
  /** Lo que el usuario hace allí, para la tarjeta del panel inicial. */
  descripcion: string;
  /** Otra descripción para quien tiene ese permiso. */
  descripcionSi?: { permiso: ClavePermiso; texto: string };
  /**
   * Pantallas que se abren desde la página índice de esta opción: el menú la resalta también
   * en ellas (por ejemplo, «Configuración» en «Parámetros»).
   */
  subopciones?: readonly OpcionMenu[];
};

const ROLES_SEGUIMIENTO = [
  ROL.administrador,
  ROL.departamento,
  ROL.direccion,
] as const;

const ROLES_REPORTES_RAP = [...ROLES_SEGUIMIENTO, ROL.liderRap] as const;

/**
 * Los reportes académicos (RF-28, RF-32), en el orden de la página índice `/reportes`. El
 * backend los abre con `@Roles`, así que cada uno declara los mismos roles.
 */
export const REPORTES: readonly OpcionMenu[] = [
  {
    // RF-32: el backend lo abre con @Roles.
    ruta: '/reportes/logro-rap',
    etiqueta: 'Reporte de logro de los RAP',
    etiquetaMenu: 'Logro de los RAP',
    descripcion:
      'Porcentaje alcanzado por RAP frente al esperado, con exportación a Excel y PDF.',
    roles: ROLES_REPORTES_RAP,
  },
  {
    // RF-28: el backend lo abre con @Roles.
    ruta: '/reportes/cumplimiento',
    etiqueta: 'Reporte de cumplimiento',
    etiquetaMenu: 'Cumplimiento',
    descripcion:
      'Proyectos docentes del período, su estado y su diligenciamiento, con exportación a Excel y PDF.',
    roles: ROLES_SEGUIMIENTO,
  },
  {
    // RF-28, HU-12-04: el backend lo abre con @Roles, con los roles del de cumplimiento.
    ruta: '/reportes/ejecucion-contenidos',
    etiqueta: 'Ejecución de contenidos',
    descripcion:
      'Temas planeados por curso frente a los dictados en las clases registradas, con exportación a Excel y PDF.',
    roles: ROLES_SEGUIMIENTO,
  },
  {
    // RF-28: el backend lo abre con @Roles.
    ruta: '/reportes/contribucion-rac-rap',
    etiqueta: 'Contribución de los RAC a los RAP',
    etiquetaMenu: 'Contribución RAC-RAP',
    descripcion:
      'Asignaturas, docentes, RAC y evidencias que aportan a cada RAP.',
    roles: ROLES_REPORTES_RAP,
  },
];

/**
 * La configuración del sistema, en el orden de la página índice `/configuracion`: todo lo que
 * el administrador ajusta sin tocar el código. En la matriz, `estructura.administrar` (el
 * Administrador). Usuarios queda aparte, porque el Departamento y la Dirección también lo
 * consultan.
 */
export const CONFIGURACION: readonly OpcionMenu[] = [
  {
    // HU-03-07.
    ruta: '/parametros',
    etiqueta: 'Parámetros del sistema',
    etiquetaMenu: 'Parámetros',
    descripcion:
      'Ajuste las reglas y los límites del sistema: alertas, inicio de sesión, archivos, revisión y catálogos.',
    permiso: 'estructura.administrar',
  },
  {
    // RF-26, HU-13-04: la misma regla que los parámetros, donde vive la periodicidad del
    // recordatorio. La bandeja de cada usuario es la campana del encabezado, que ya se llama
    // «Notificaciones»; por eso esta opción tiene otro nombre.
    ruta: '/notificaciones/configuracion',
    etiqueta: 'Configuración de notificaciones',
    etiquetaMenu: 'Configurar avisos',
    descripcion:
      'Elija qué eventos generan aviso, cuáles saldrán también por correo y cada cuánto se recuerdan las sesiones pendientes.',
    permiso: 'estructura.administrar',
  },
  {
    // RF-19, HU-08-01.
    ruta: '/festivos',
    etiqueta: 'Días festivos',
    descripcion:
      'Cargue los festivos de ley de cada año y agregue los días sin clase de la Universidad. Los calendarios se recalculan solos.',
    permiso: 'estructura.administrar',
  },
];

/**
 * Opciones del menú del panel, en su orden. Cada pantalla nueva agrega aquí su opción, con el
 * permiso de la matriz que la habilita o, si el backend usa `@Roles`, los mismos roles.
 */
export const OPCIONES_MENU: readonly OpcionMenu[] = [
  {
    ruta: '/proyectos-docentes',
    etiqueta: 'Proyectos docentes',
    descripcion: 'Consulte los proyectos docentes a su cargo.',
    descripcionSi: {
      permiso: 'proyectos.crear',
      texto: 'Cree los proyectos del período y asigne los docentes.',
    },
    permiso: 'proyectos.leer',
  },
  {
    // RF-18, HU-07-02: quien aprueba proyectos en la matriz (el Departamento).
    ruta: '/revision',
    etiqueta: 'Revisión de proyectos docentes',
    etiquetaMenu: 'Revisión',
    descripcion:
      'Proyectos enviados a revisión: apruébelos o devuélvalos con observaciones.',
    permiso: 'proyectos.aprobar',
  },
  {
    // RF-25: el backend lo abre con @Roles.
    ruta: '/seguimiento',
    etiqueta: 'Seguimiento del diligenciamiento',
    etiquetaMenu: 'Seguimiento',
    descripcion: 'Qué proyectos van al día y cuáles tienen pendientes.',
    roles: ROLES_SEGUIMIENTO,
  },
  {
    // RF-30 y RF-31: el backend lo abre con @Roles.
    ruta: '/mediciones',
    etiqueta: 'Medición de RAP',
    descripcion:
      'Valoraciones, consolidado y acciones de mejora de cada curso.',
    roles: [ROL.docente, ROL.liderRap, ROL.departamento],
  },
  {
    // HU-10-04: el backend la abre con `documentos.leer`, pero sus RAP salen de `lider_rap`:
    // solo el Líder RAP tiene RAP a cargo. A los demás roles les mostraría una lista vacía.
    ruta: '/evidencias-rap',
    etiqueta: 'Evidencias de mis RAP',
    etiquetaMenu: 'Evidencias RAP',
    descripcion:
      'Fotos de clase que cargan los docentes en las asignaturas que tributan a sus RAP.',
    roles: [ROL.liderRap],
  },
  {
    // RF-02: quien consulta usuarios en la matriz (el Administrador, y el Departamento y la
    // Dirección solo para verlos). Crear y editar lo decide `usuarios.administrar`.
    ruta: '/usuarios',
    etiqueta: 'Usuarios',
    descripcion: 'Personas con acceso al sistema, con sus roles y su estado.',
    descripcionSi: {
      permiso: 'usuarios.administrar',
      texto:
        'Cree usuarios, asígneles roles e inactive a quienes ya no deben entrar.',
    },
    permiso: 'usuarios.leer',
  },
  {
    // RF-28 y RF-32: una sola opción para los tres reportes (URAP-126), que en el teléfono
    // ocupaban tres líneas del menú. La ve quien puede abrir al menos uno; la página índice
    // muestra solo los suyos.
    ruta: '/reportes',
    etiqueta: 'Reportes',
    descripcion:
      'Logro de los RAP, cumplimiento y contribución de los RAC a los RAP, con exportación a Excel y PDF.',
    roles: [...new Set(REPORTES.flatMap((reporte) => reporte.roles ?? []))],
  },
  {
    // Una sola opción para la configuración (HU-08-01), como «Reportes»: en el teléfono, cada
    // pantalla de configuración ocupaba una línea del menú.
    ruta: '/configuracion',
    etiqueta: 'Configuración',
    descripcion:
      'Parámetros del sistema, avisos y recordatorios, y días festivos.',
    permiso: 'estructura.administrar',
    subopciones: CONFIGURACION,
  },
  {
    // RF-29, HU-14-02: la consulta completa de la auditoría. En la matriz inicial solo el
    // Administrador tiene `auditoria.administrar`; el `auditoria.leer` del Departamento y de
    // la Dirección es una consulta restringida que el programa aún no define, y no abre esta.
    ruta: '/auditoria',
    etiqueta: 'Auditoría',
    descripcion:
      'Quién hizo qué, cuándo y sobre qué: cambios, aprobaciones y consultas sensibles.',
    permiso: 'auditoria.administrar',
  },
];
