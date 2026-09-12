# SAPC-ONAC Backend Dockerfile (PRODUCCIÓN)
# Multi-stage build para minimizar tamaño de la imagen final.
#
# Soporte de proxy corporativo (Cuba):
#   docker compose build --build-arg HTTP_PROXY=http://proxy.onac.cu:8080 \
#                                HTTPS_PROXY=http://proxy.onac.cu:8080 \
#                                NO_PROXY=localhost,127.0.0.1,postgres,redis
#   o vía .env (ver docker-compose.yml `args:` ya configurados)

# syntax=docker/dockerfile:1.6

# ===== Stage 1: deps =====
FROM oven/bun:1.3 AS deps

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG npm_config_registry
ARG BUN_CONFIG_HTTP_PROXY

ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy} \
    npm_config_registry=${npm_config_registry} \
    BUN_CONFIG_HTTP_PROXY=${BUN_CONFIG_HTTP_PROXY}

WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# ===== Stage 2: builder =====
FROM oven/bun:1.3 AS builder

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy

ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy}

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generar PrismaClient (necesario para que el backend pueda importar @prisma/client)
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN bunx prisma generate
# Build (si se requiere transpilar TS a JS)
RUN bun build src/index.ts --target bun --outfile dist/index.js

# ===== Stage 3: runner (sin proxy vars — no necesita internet) =====
FROM oven/bun:1.3-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=builder /app/dist/index.js ./index.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 4000
CMD ["bun", "index.js"]
