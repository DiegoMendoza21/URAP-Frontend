# URAP Frontend — Instrucciones del proyecto

Interfaz del sistema URAP: seguimiento, control y análisis de los **proyectos docentes** del
programa de Administración Industrial de la Universidad de Cartagena. Es el prototipo
funcional de una tesis de pregrado, pensado para escalar después a toda la universidad.

Trabajamos en español: código, commits, comentarios e interfaz.

**Repo del backend:** https://github.com/DiegoMendoza21/URAP-Backend (separado).
Toda la lógica de negocio y la autorización viven allá. Este repo no habla con la base de
datos ni con el almacenamiento de archivos: solo consume la API REST.

## Antes de escribir código

El dominio es institucional y no se deduce leyendo el repositorio. Lee primero:

- `docs/glosario-dominio.md` — **siempre**. RAP, RAC, proyecto docente, roles, escalas.
  Confundir RAP con RAC es el error más fácil y más caro de este proyecto.
- `docs/urap-backlog.md` — qué se construye y en qué orden: 15 épicas, 89 historias, 8 sprints.
- `docs/indice-requisitos.md` — para ubicar el requisito que aplica.
- `docs/requisitos-funcionales.md` — el RF completo de la pantalla que vas a construir,
  **incluidas sus excepciones**: ahí están los estados de error que la interfaz debe mostrar.
- `docs/requisitos-no-funcionales.md` — al tocar usabilidad, rendimiento o archivos.

No los cargues enteros por costumbre: busca el RF que necesitas y lee esa sección.

## Esto NO es un gestor de proyectos genérico

Un «proyecto docente» es el documento institucional de planeación de una asignatura en un
período académico, no un proyecto con cronograma y porcentaje de avance. Si una pantalla
termina mostrando «línea de investigación», «fecha estimada de finalización» o «avance 70 %»,
está mal: ese es vocabulario de gestión de proyectos y no existe en este dominio.
Lee `docs/glosario-dominio.md` antes de nombrar un campo.

## Stack

Definido en el Producto 2 de la tesis. No cambiarlo sin actualizar también la tesis, que
documenta esta arquitectura en el diagrama de despliegue, el de componentes y los sprints.

- **Next.js** con React y **TypeScript**. No React a pelo con react-router, no JavaScript
  plano: el enrutamiento es el de Next.js.
- **PWA**, con diseño responsive real.
- Consumo de la API REST del backend sobre HTTPS, con JWT en las peticiones protegidas.
- Los tipos se generan desde la especificación OpenAPI del backend; no se escriben a mano
  ni se duplican interfaces que ya existen allá.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

<!-- TODO: agregar el comando de generación de tipos desde el OpenAPI del backend -->

## Reglas que no se negocian

**La autorización real la hace el backend.** Aquí se arma el menú y se ocultan acciones
según los roles del usuario, pero eso es presentación. Nunca asumas que ocultar un botón
protege algo, y nunca tomes una decisión de permisos que el backend no haya validado.

**Un usuario tiene varios roles.** Hay docentes que además son líderes RAP. El menú y las
pantallas se arman a partir de una lista de roles, no de un rol único.

**El teléfono es un caso de uso real, no una concesión.** El docente registra la clase
saliendo del salón y sube las evidencias fotográficas desde ahí. Las pantallas de registro
de sesión y de carga de evidencias se diseñan primero para pantalla pequeña.

**Formularios largos por secciones.** El proyecto docente se diligencia por pasos,
conservando la numeración del formato institucional (punto 2 descripción, punto 3 RAC,
punto 4 estrategias, punto 5 evaluación, punto 6 contenidos, punto 7 bibliografía). Los
docentes ya conocen esa numeración y eso es lo que hace que adopten el sistema. Guardar
progreso parcial: nadie llena todo de una sentada.

**Las alertas de vencimiento son del backend.** Las sesiones vencidas se muestran en rojo
con los días de atraso y las próximas a vencer en color de advertencia, pero el umbral de
días viene parametrizado del servidor. No lo hardcodees.

**Datos personales.** Inasistencias, fotos de clase y valoraciones individuales están
cubiertas por la Ley 1581 de 2012. No mostrarlas a roles no autorizados, presentarlas
agregadas en los reportes consolidados y **nunca** usar nombres reales de estudiantes en
mocks, fixtures ni capturas de pantalla.

**Mensajes en español de usuario.** Validaciones, errores y confirmaciones en lenguaje
comprensible, sin detalles técnicos ni códigos internos.

## Convenciones

- Componentes en PascalCase; carpetas y rutas en minúscula con guiones.
- Nombres de dominio en español y con el término del glosario: `proyectoDocente`,
  `sesionClase`, `rac`, `rap`. No traducir al inglés ni abreviar.
- Commits en español, en imperativo, referenciando el requisito:
  `feat(rf-20): seleccionar temas dictados en el registro de clase`.

## Cómo trabajar

- Antes de una tarea de varios archivos, propón un plan y espera aprobación.
- Una rama y un PR por requisito o por grupo pequeño de requisitos relacionados.
- Al terminar un RF, verifica contra su secuencia normal **y sus excepciones**; las
  excepciones son criterios de aceptación, no casos borde opcionales.
- Si un requisito necesita un endpoint que el backend todavía no expone, para y dilo.
  No inventes la forma de la respuesta ni dejes un mock escondido en el código.
