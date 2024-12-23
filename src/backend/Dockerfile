# Stage 1: Builder
FROM node:20-alpine AS builder

# Set build arguments
ARG NODE_ENV=development
ARG BUILD_VERSION=latest

# Set environment variables
ENV NODE_ENV=${NODE_ENV} \
    CI=true \
    HUSKY=0

# Install build essentials and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files with strict permissions
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./

# Install dependencies with exact versions
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy source code with proper ownership
COPY --chown=node:node . .

# Run security audit
RUN npm run security:audit

# Build TypeScript with optimizations
RUN npm run build

# Run tests (assuming they don't require external services)
RUN npm run test

# Stage 2: Production
FROM node:20-alpine

# Set build arguments for production
ARG NODE_ENV=production
ARG BUILD_VERSION=latest

# Set production environment variables
ENV NODE_ENV=${NODE_ENV} \
    PORT=3000 \
    TZ=UTC

# Install production security updates
RUN apk update && \
    apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=node:node package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built assets from builder
COPY --chown=node:node --from=builder /app/dist ./dist

# Set strict file permissions
RUN chmod -R 550 /app && \
    chown -R node:node /app

# Configure security headers and settings
COPY --chown=node:node secure-headers.json ./config/

# Switch to non-root user
USER node

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Expose application port
EXPOSE ${PORT}

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Add metadata labels
LABEL maintainer="GameDay Platform Team <team@gameday.platform>" \
    version="1.0.0" \
    description="GameDay Platform Backend Services" \
    security.updates="true" \
    org.opencontainers.image.source="https://github.com/gameday-platform/backend" \
    org.opencontainers.image.version="${BUILD_VERSION}" \
    org.opencontainers.image.vendor="GameDay Platform" \
    org.opencontainers.image.title="GameDay Platform Backend" \
    org.opencontainers.image.description="AI-driven tabletop exercise system backend services" \
    org.opencontainers.image.created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"