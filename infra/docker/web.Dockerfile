# SAPC-ONAC Frontend Dockerfile (PRODUCCIÓN — Next.js 16 standalone output)
#
# Soporte de proxy corporativo (Cuba):
#   docker compose build --build-arg HTTP_PROXY=http://proxy.onac.cu:8080 \
#                                HTTPS_PROXY=http://proxy.onac.cu:8080 \
#                                NO_PROXY=localhost,127.0.0.1,postgres,redis

# syntax=docker/dockerfile:1.6

# ===== Stage 1: deps =====
FROM node:26.2.0-bookworm-slim AS deps

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG npm_config_registry

ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    no_proxy=${no_proxy} \
    npm_config_registry=${npm_config_registry}

RUN npm install -g pnpm@9.15.0
WORKDIR /app
COPY package.json bun.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
  elif [ -f bun.lock ]; then corepack use bun && bun install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else echo "No lockfile found" && exit 1; fi

# ===== Stage 2: builder =====
FROM node:26.2.0-bookworm-slim AS builder

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

RUN npm install -g pnpm@9.15.0
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# ===== Stage 3: runner (sin proxy vars — no necesita internet) =====
FROM node:26.2.0-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
