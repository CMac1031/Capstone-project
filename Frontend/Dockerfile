FROM node:22.23.2-alpine3.24 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM ghcr.io/nginx/nginx-unprivileged:1.31.1-alpine3.23

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080