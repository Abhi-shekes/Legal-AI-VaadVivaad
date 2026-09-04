# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Baked into the JS bundle at build time (Vite env vars are compile-time).
# These must be reachable from the *browser*, not from inside the container.
ARG VITE_API_URL=http://localhost:8000
ARG VITE_SOCKET_URL=http://localhost:8000
ARG VITE_BASE_PATH=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH

RUN npm run build

# --- Dev stage (hot reload; not used by the production build) ---
# Deliberately placed BEFORE the serve stage: Docker builds the last stage by
# default, so appending this at the end would silently turn every production
# build into a dev image. Select it with `target: dev`.
#
# Only the manifests are copied. The source arrives as a bind mount at run
# time, and node_modules stays in the image (shadowed by an anonymous volume)
# because these are musl binaries -- the host's are glibc, and mounting those
# in is exactly what broke rollup before.
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# --- Serve stage (runs as the unprivileged "nginx" user out of the box) ---
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
