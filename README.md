# URAP — Frontend

Interfaz del sistema URAP: seguimiento, control y análisis de los proyectos docentes del
programa de Administración Industrial de la Universidad de Cartagena. Prototipo funcional
de una tesis de pregrado.

Consume la API REST de [URAP-Backend](https://github.com/DiegoMendoza21/URAP-Backend). El
contrato entre los dos es la especificación OpenAPI que publica esa API.

**Stack:** Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4, PWA.

## Requisitos

- Node.js 26 LTS (también sirven 24.15 y 22.22.3 o superiores) con npm 11 o superior
- El backend en ejecución en `http://localhost:3001` (ver su README)

## Puesta en marcha

```bash
cp .env.example .env.local   # URL de la API; sin ella, dev y build se detienen
npm install
npm run dev                  # http://localhost:3000
```

La pantalla inicial consulta `GET /api/salud` y muestra si el servidor responde. El puerto
3000 es fijo porque es el origen que el backend autoriza por CORS: si está ocupado, `dev` se
detiene en vez de pasarse a otro puerto.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 3000 |
| `npm run build` | Compilación de producción |
| `npm run start` | Sirve la compilación en el puerto 3000 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier sobre `src/` y los archivos de configuración |
| `npm run tipos:generar` | Regenera `src/api/openapi.d.ts` desde el OpenAPI del backend |

## Tipos de la API

Los tipos de la API no se escriben a mano. `npm run tipos:generar`, con el backend levantado,
los genera desde `http://localhost:3001/api/openapi.json` en `src/api/openapi.d.ts`. Ese
archivo se versiona para que la compilación no dependa del backend: cuando cambie el
contrato, se regenera y se hace commit junto con el cambio que lo usa.

## Dependencias

`.npmrc` hace que npm instale solo versiones publicadas hace al menos 14 días
(`min-release-age`), también entre las dependencias transitivas, y que guarde versiones
exactas. Los scripts de instalación de las dependencias se autorizan uno por uno en el campo
`allowScripts` de `package.json`, con `npm install-scripts`.

## Documentación del proyecto

- `CLAUDE.md`: reglas del proyecto, stack, convenciones y forma de trabajo.
- `docs/`: glosario del dominio, requisitos y backlog.
