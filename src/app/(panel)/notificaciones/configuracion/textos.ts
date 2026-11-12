/*
 * Cuándo se genera cada tipo de notificación (RF-26), en lenguaje del administrador. Qué tipos
 * existen lo dice el backend: un tipo que todavía no tenga texto aquí aparece solo con su
 * nombre.
 */
export const CUANDO_SE_GENERA: Record<string, string> = {
  asignacion_proyecto:
    'Al docente, cuando el Departamento le asigna un proyecto docente.',
  sesion_vencida:
    'Recordatorio al docente que tiene clases vencidas sin registrar. Agrupa todos sus cursos en un solo aviso.',
  sesion_por_vencer:
    'Recordatorio al docente que solo tiene clases por vencer. Agrupa todos sus cursos en un solo aviso.',
  proyecto_enviado:
    'A quienes revisan en el programa, cuando un docente envía su proyecto a revisión.',
  proyecto_devuelto:
    'A los docentes del proyecto, cuando el Departamento lo devuelve con observaciones.',
  proyecto_aprobado:
    'A los docentes del proyecto, cuando el Departamento lo aprueba.',
  cierre_periodo:
    'Al cerrar el período académico. Todavía no se genera: llegará cuando el sistema permita cerrar el período.',
  festivos_no_parametrizados:
    'Al administrador, cuando se genera el calendario de un año que no tiene los días festivos cargados.',
};

/** Los dos tipos del recordatorio de sesiones: van juntos, con la periodicidad. */
export const TIPOS_RECORDATORIO = ['sesion_vencida', 'sesion_por_vencer'];
