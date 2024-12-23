# Stage 1: Builder stage for custom plugins and optimizations
FROM kong:3.5-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    build-base \
    ruby \
    ruby-dev \
    luarocks \
    openssl-dev \
    pcre-dev \
    zlib-dev \
    openresty-openssl-dev

# Set working directory for plugin builds
WORKDIR /custom-plugins

# Install custom Kong plugins if needed
# Example: RUN luarocks install kong-plugin-rate-limiting-advanced

# Stage 2: Final production image
FROM kong:3.5-alpine

# Set labels for container metadata
LABEL maintainer="GameDay Platform Team" \
      version="1.0.0" \
      description="Production Kong API Gateway for GameDay Platform"

# Install runtime dependencies
RUN apk add --no-cache \
    tzdata \
    ca-certificates \
    openssl \
    && adduser -S -D -H -h /usr/local/kong kong \
    && mkdir -p /usr/local/kong/declarative \
    /usr/local/kong/ssl \
    /usr/local/kong/plugins \
    /var/log/kong \
    && chown -R kong:kong /usr/local/kong \
    /var/log/kong

# Copy configuration files
COPY --chown=kong:kong kong.yml /usr/local/kong/declarative/kong.yml
COPY --chown=kong:kong plugins/auth.yml /usr/local/kong/plugins/auth.yml
COPY --chown=kong:kong plugins/rate-limiting.yml /usr/local/kong/plugins/rate-limiting.yml
COPY --chown=kong:kong plugins/cors.yml /usr/local/kong/plugins/cors.yml

# Set secure permissions
RUN chmod 644 /usr/local/kong/declarative/kong.yml \
    && chmod 644 /usr/local/kong/plugins/*.yml \
    && chmod -R 755 /usr/local/kong/plugins \
    && chown -R kong:kong /usr/local/kong

# Set environment variables
ENV KONG_DATABASE=off \
    KONG_DECLARATIVE_CONFIG=/usr/local/kong/declarative/kong.yml \
    KONG_PROXY_ACCESS_LOG=/dev/stdout \
    KONG_ADMIN_ACCESS_LOG=/dev/stdout \
    KONG_PROXY_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_LISTEN=0.0.0.0:8001 \
    KONG_PROXY_LISTEN=0.0.0.0:8000 \
    KONG_SSL=on \
    KONG_SSL_CIPHER_SUITE=modern \
    KONG_NGINX_WORKER_PROCESSES=auto \
    KONG_PLUGINS=bundled,rate-limiting-advanced,jwt-auth \
    KONG_NGINX_WORKER_CONNECTIONS=2048 \
    KONG_PROXY_SSL_ENABLED=on \
    KONG_ADMIN_SSL_ENABLED=on

# Security hardening
RUN addgroup -S kong \
    && adduser -S kong -G kong \
    && chown -R kong:kong /usr/local/kong \
    && chmod -R 755 /usr/local/kong

# Expose ports
EXPOSE 8000 8001 8443 8444

# Set up healthcheck
HEALTHCHECK --interval=10s --timeout=10s --retries=10 --start-period=5s \
    CMD kong health

# Switch to non-root user
USER kong

# Set working directory
WORKDIR /usr/local/kong

# Start Kong
CMD ["kong", "docker-start"]