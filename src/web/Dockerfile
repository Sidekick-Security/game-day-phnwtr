# ---- Build Stage ----
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Add non-root user for build
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install build dependencies and security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with exact versions and security audit
RUN npm ci && \
    npm audit && \
    # Clean npm cache
    npm cache clean --force

# Copy source code and configuration files
COPY . .

# Set production environment
ENV NODE_ENV=production \
    VITE_APP_ENV=production

# Build application with optimizations
RUN npm run build && \
    # Remove dev dependencies
    npm prune --production

# ---- Production Stage ----
FROM nginx:1.25-alpine

# Add nginx user/group and set permissions
RUN addgroup -S nginx && \
    adduser -S -G nginx nginx && \
    # Create required directories with correct permissions
    mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    # Make nginx run with nginx user
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY nginx/compression.conf /etc/nginx/compression.conf

# Copy built assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Configure security settings
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx && \
    chmod -R 755 /var/run && \
    # Remove default nginx config
    rm /etc/nginx/conf.d/default.conf

# Add healthcheck configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Use non-root user
USER nginx

# Set read-only root filesystem
VOLUME ["/var/cache/nginx", "/var/run"]

# Start nginx with optimized settings
CMD ["nginx", "-g", "daemon off;"]

# Build arguments and labels
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.version=$VERSION \
      org.label-schema.name="gameday-platform-web" \
      org.label-schema.description="GameDay Platform Web Application" \
      org.label-schema.vendor="GameDay Platform" \
      org.label-schema.schema-version="1.0" \
      security.privileged="false"

# Security configurations
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    # Disable npm update notifications
    NO_UPDATE_NOTIFIER=1

# Drop all capabilities except those needed
STOPSIGNAL SIGQUIT

# Create .dockerignore if it doesn't exist
# .dockerignore contents should include:
# .git
# node_modules
# npm-debug.log
# build
# .env
# .env.*
# *.log
# .DS_Store
# coverage
# .idea
# .vscode
# *.swp
# *.swo