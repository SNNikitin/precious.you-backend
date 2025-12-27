FROM node:24-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build stage (for TypeScript compilation if needed)
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run typecheck

# Production stage
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 precious

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=precious:nodejs . .

# Create data directory
RUN mkdir -p /app/data && chown -R precious:nodejs /app/data

USER precious

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "--experimental-transform-types", "src/index.ts"]
