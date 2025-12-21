# ==============================================================================
# Stage 1: Build stage - Install dependencies and generate Prisma client
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl

# Copy package files first (better layer caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for Prisma)
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# ==============================================================================
# Stage 2: Production stage - Only runtime dependencies
# ==============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache openssl dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy prisma schema and generated client from builder
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy source code
COPY src ./src/
COPY scripts ./scripts/

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Create logs directory
RUN mkdir -p /data/logs && chown -R nodejs:nodejs /data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]
