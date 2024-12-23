# Stage 1: Builder stage
FROM python:3.11-slim AS builder

# Set build arguments
ARG APP_USER=appuser
ARG APP_GROUP=appgroup
ARG APP_HOME=/app
ARG PORT=8002

# Set working directory
WORKDIR ${APP_HOME}

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and group
RUN groupadd -r ${APP_GROUP} && \
    useradd -r -g ${APP_GROUP} -d ${APP_HOME} -s /sbin/nologin -c "Docker image user" ${APP_USER}

# Copy requirements file with proper permissions
COPY --chown=${APP_USER}:${APP_GROUP} requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir safety bandit

# Copy service source code
COPY --chown=${APP_USER}:${APP_GROUP} . .

# Run security checks
RUN safety check && \
    bandit -r . -ll

# Clean up build dependencies
RUN apt-get purge -y --auto-remove build-essential curl git && \
    rm -rf /var/lib/apt/lists/*

# Set proper permissions
RUN chown -R ${APP_USER}:${APP_GROUP} ${APP_HOME} && \
    chmod -R 755 ${APP_HOME}

# Stage 2: Final production stage
FROM python:3.11-slim

# Set build arguments
ARG APP_USER=appuser
ARG APP_GROUP=appgroup
ARG APP_HOME=/app
ARG PORT=8002

# Set environment variables
ENV PYTHONPATH=${APP_HOME}
ENV PYTHONUNBUFFERED=1
ENV PORT=${PORT}

# Create non-root user and group
RUN groupadd -r ${APP_GROUP} && \
    useradd -r -g ${APP_GROUP} -d ${APP_HOME} -s /sbin/nologin -c "Docker image user" ${APP_USER}

# Set working directory
WORKDIR ${APP_HOME}

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy built application from builder stage
COPY --from=builder --chown=${APP_USER}:${APP_GROUP} ${APP_HOME} ${APP_HOME}

# Create necessary directories with proper permissions
RUN mkdir -p ${APP_HOME}/logs /tmp && \
    chown -R ${APP_USER}:${APP_GROUP} ${APP_HOME}/logs /tmp && \
    chmod -R 755 ${APP_HOME}/logs && \
    chmod 1777 /tmp

# Set security headers
ENV PYTHONHASHSEED=random
ENV PIP_NO_CACHE_DIR=1

# Expose port
EXPOSE ${PORT}

# Configure healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl --fail http://localhost:${PORT}/health || exit 1

# Drop all capabilities and only add necessary ones
RUN apt-get update && apt-get install -y --no-install-recommends libcap2-bin && \
    setcap cap_net_bind_service=+ep /usr/local/bin/python3.11 && \
    apt-get purge -y --auto-remove libcap2-bin && \
    rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER ${APP_USER}:${APP_GROUP}

# Set read-only filesystem
VOLUME ["${APP_HOME}/logs", "/tmp"]

# Set entrypoint with proper configuration
ENTRYPOINT ["uvicorn", "analytics_service.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "4", "--limit-concurrency", "1000", "--backlog", "2048"]

# Add metadata labels
LABEL maintainer="GameDay Platform Team" \
      version="1.0.0" \
      description="Analytics Service for GameDay Platform" \
      org.opencontainers.image.source="https://github.com/gameday-platform/analytics-service" \
      org.opencontainers.image.licenses="Proprietary"