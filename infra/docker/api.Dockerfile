# SAPC-ONAC Backend Dockerfile
# Multi-stage build para minimizar tamaño de la imagen final.

FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build (si se requiere transpilar TS a JS)
RUN bun build src/index.ts --target bun --outfile dist/index.js

FROM oven/bun:1.3-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=builder /app/dist/index.js ./index.js
COPY --from=builder /app/package.json ./package.json
EXPOSE 4000
CMD ["bun", "index.js"]
