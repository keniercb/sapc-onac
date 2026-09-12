# SAPC-ONAC Frontend Dockerfile (Next.js 16 standalone output)

FROM node:26.8.2-bookworm-slim AS deps
WORKDIR /app
COPY package.json bun.lock* package-lock.json* ./
RUN \
  if [ -f bun.lock ]; then bun install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else echo "No lockfile found" && exit 1; fi

FROM node:26.8.2-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:26.8.2-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
