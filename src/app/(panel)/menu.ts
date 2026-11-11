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
    // HU-03-07: quien administra la estructura académica en la matriz (el Administrador).
    ruta: '/parametros',
    etiqueta: 'Parámetros del sistema',
    etiquetaMenu: 'Parámetros',
    descripcion:
      'Ajuste las reglas y los límites del sistema: alertas, inicio de sesión, archivos, revisión y catálogos.',
    permiso: 'estructura.administrar',
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
