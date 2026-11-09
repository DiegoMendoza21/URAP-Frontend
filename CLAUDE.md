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
- `docs/datos-institucionales.md` — los datos reales del programa: matriz de permisos por rol
  (qué ve y qué puede hacer cada rol en cada pantalla), RAP y rúbricas, escala, planes de
  estudio 1702 y 2502, calendario 2026-2 y catálogo de estrategias del MEN (RF-13). Sirve para
  no inventar textos ni ejemplos en la interfaz.
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
  plano: el enrutamiento es el de Next.js. La documentación de la versión instalada está en
  `node_modules/next/dist/docs/`: consúltala antes de usar una API de Next.js, porque la
  versión 16 cambió convenciones y valores por defecto (por ejemplo, `cacheComponents`).
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
npm run tipos:generar   # con el backend levantado
```

`npm run tipos:generar` regenera `src/api/openapi.d.ts` desde `http://localhost:3001/api/openapi.json`.
Ese archivo no se edita a mano: cuando cambia el contrato del backend, se regenera y se hace
commit junto con el cambio que lo usa.

## Reglas que no se negocian

**La autorización real la hace el backend.** Aquí se arma el menú y se ocultan acciones
según los roles del usuario, pero eso es presentación. Nunca asumas que ocultar un botón
protege algo, y nunca tomes una decisión de permisos que el backend no haya validado.

**El token nunca llega al navegador.** El navegador solo habla con `/api` de este mismo
servidor, y `src/app/api/[...ruta]/route.ts` reenvía al backend con el token de la cookie
`httpOnly`. No llames al backend directamente desde el navegador ni guardes el token en
`localStorage` o en una cookie legible por JavaScript.

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

- **Trabajo en equipo:** somos dos personas que se relevan. Sigue `CONTRIBUTING.md`: el estado
  vive en Jira (espacio `URAP`) y en GitHub. `/tomar-historia` empieza una historia y `/relevo`
  la deja lista para que la otra persona continúe.
- Antes de una tarea de varios archivos, propón un plan y espera aprobación.
- Una rama y un PR por requisito o por grupo pequeño de requisitos relacionados.
- **Trabaja siempre sobre lo último de `main`.** La copia local de `main` se atrasa sin avisar, y
  los errores que solo aparecen al juntar el trabajo de los dos deben salir antes de la revisión.
  - Antes de empezar, corre `git fetch origin` y crea la rama desde `origin/main`, nunca desde
    un `main` local.
  - Antes de pedir revisión, y otra vez antes de integrar, trae `origin/main` a tu rama
    (`git merge origin/main`), resuelve los conflictos y vuelve a correr las pruebas.
  - Si tu PR está apilado sobre otro, cuando ese se integre cambia la base a `main` y repite.
- Al terminar un RF, verifica contra su secuencia normal **y sus excepciones**; las
  excepciones son criterios de aceptación, no casos borde opcionales.
- Si un requisito necesita un endpoint que el backend todavía no expone, para y dilo.
  No inventes la forma de la respuesta ni dejes un mock escondido en el código.
