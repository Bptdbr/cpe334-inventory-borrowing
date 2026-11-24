# syntax=docker/dockerfile:1
# Multi-stage build for the npm-workspaces monorepo (backend + frontend).
# One container serves the API and the built SPA on the same origin (PORT).

# ---- Stage 1: install, generate Prisma client, build backend and frontend ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Prisma needs OpenSSL at build and run time.
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy manifests first so the dependency layer is cached.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --include=dev

COPY backend backend
COPY frontend frontend

# Generate the Prisma client, then build both workspaces (tsc + vite build).
RUN npx prisma generate --schema=backend/prisma/schema.prisma \
 && npm run build

# ---- Stage 2: runtime image ----
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    CLIENT_DIST_PATH=/app/frontend/dist

# Full node_modules are kept on purpose: the migration job runs
# `prisma migrate deploy` and the seed (tsx) from this same image.
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules node_modules
COPY --from=build --chown=node:node /app/backend backend
COPY --from=build --chown=node:node /app/frontend/dist frontend/dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/server.js"]
