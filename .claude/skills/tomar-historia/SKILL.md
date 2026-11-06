---
name: tomar-historia
description: Toma una historia de usuario de URAP en Jira para trabajar su parte de frontend. Elige la siguiente disponible del sprint activo, o la indicada, se la asigna a quien trabaja (o deja constancia si la otra persona hizo el backend), la pasa a En curso y prepara su rama. Si es un relevo, trae la rama existente y lee el último comentario de relevo.
argument-hint: "[HU-xx-yy o URAP-nn, opcional]"
disable-model-invocation: true
---

Toma una historia para trabajar su parte de frontend siguiendo `CONTRIBUTING.md`.

Usa el conector de Atlassian sobre el sitio `mauriciosalvadorcastro.atlassian.net`, espacio
`URAP`. Si el conector no está disponible o no tiene acceso a ese sitio, detente y pide al usuario
que lo conecte.

1. **Elegir la historia.**
   - Si el usuario indicó una (`$ARGUMENTS`), usa esa. Búscala por el código HU al inicio del
     título o por su clave `URAP-nn`.
   - Si no indicó ninguna, busca en el sprint activo:
     `project = URAP AND sprint in openSprints() AND issuetype = Historia AND status in ("Por hacer", "En revisión") ORDER BY Rank ASC`.
     Una historia En revisión puede tener listo el backend y pendiente el frontend: revisa sus
     comentarios y enlaces. Descarta las bloqueadas por incidencias que todavía no estén en
     Finalizado (`issue in linkedIssues(<clave>, "is blocked by")`). Quédate con la primera que
     quede.
2. **Mostrarla y confirmar.** Muestra el código, el título, los criterios de aceptación, las
   dependencias y el estado de su parte de backend (PR, rama), y pide confirmación antes de
   cambiar nada.
3. **Asignar y mover.**
   - Si nadie la tiene, asígnala al usuario actual de Jira y pásala a En curso.
   - Si la tiene la otra persona porque hizo el backend, no la reasignes: deja un comentario
     diciendo que tomas la parte del frontend.
   - Si era un relevo del frontend de la otra persona, reasígnala.
4. **Rama.**
   - Si ya existe una rama para esta historia (`git ls-remote --heads origin "feat/<código-hu>*"`,
     con el código en minúsculas), tráela con `git fetch` y `git switch`. Lee el último
     comentario de relevo de la historia y resume al usuario qué falta.
   - Si no existe, `git switch main`, `git pull` y
     `git switch -c feat/<código-hu-en-minúsculas>-<resumen-corto>`.
5. **Preparar el trabajo.**
   - Lee el RF de la historia en `docs/requisitos-funcionales.md`, con su secuencia normal y sus
     excepciones, y las reglas de `CLAUDE.md`.
   - Con el backend levantado, corre `npm run tipos:generar` y comprueba que existan los
     endpoints que la historia necesita. Si falta alguno, dilo antes de seguir: no inventes la
     forma de la respuesta.
   - Propón un plan y espera aprobación antes de escribir código.
