# =============================================================================
# localBi — Production Multi-Stage Linux Container (Node.js 24 + Debian Bookworm)
# =============================================================================

# --- Stage 1: Dependencies & Build ---
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine compatibility
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install pinned dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and build Next.js production bundle
COPY tsconfig.json next.config.ts eslint.config.js ./
COPY src ./src
COPY public ./public

ENV NODE_ENV=production
RUN npm run build
RUN npm prune --omit=dev

# --- Stage 2: Production Runtime Runner ---
FROM node:24-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run as non-root user
USER node

# Copy built application and required runtime dependencies
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/package-lock.json ./package-lock.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start"]
