# Imagen del frontend de URAP para el despliegue. La construye y la corre el docker-compose.yml de
# URAP-Backend (despliegue/), detrás de Caddy con HTTPS; la guía está en docs/despliegue.md de
# ese repositorio. En desarrollo no hace falta: se trabaja con `npm run dev`.
#
# URL_API no se necesita para construir: la lee el servidor de Next al atender cada petición.

FROM node:26-bookworm-slim AS construccion
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:26-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=construccion /app/package.json /app/package-lock.json /app/next.config.ts ./
COPY --from=construccion /app/node_modules ./node_modules
COPY --from=construccion /app/public ./public
COPY --from=construccion /app/.next ./.next
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "--port", "3000"]
