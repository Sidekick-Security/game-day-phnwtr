# syntax=docker/dockerfile:1.4

# Builder stage
FROM python:3.11-slim AS builder
# version: 3.11.7

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and user
RUN groupadd -g 1000 gameday && \
    useradd -u 1000 -g gameday -s /bin/bash -m gameday

# Set working directory
WORKDIR /app

# Copy requirements file
COPY --chown=gameday:gameday requirements.txt .

# Install Python packages
RUN python -m pip install --no-cache-dir --upgrade pip==23.2.1 && \
    python -m pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim AS final
# version: 3.11.7

# Install tini and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    WORKERS=4 \
    TZ=UTC \
    APP_ENV=production \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Create app directory and user
RUN groupadd -g 1000 gameday && \
    useradd -u 1000 -g gameday -s /bin/bash -m gameday && \
    mkdir -p /app/scenario_service && \
    chown -R gameday:gameday /app

# Set working directory
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=gameday:gameday /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder --chown=gameday:gameday /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=gameday:gameday ./scenario_service /app/scenario_service

# Create necessary directories with proper permissions
RUN mkdir -p /tmp && \
    chown -R gameday:gameday /tmp && \
    chmod 1777 /tmp

# Set up container labels
LABEL org.opencontainers.image.title="scenario-service" \
      org.opencontainers.image.description="AI-driven scenario generation service" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.vendor="GameDay Platform" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/gameday-platform/scenario-service"

# Switch to non-root user
USER gameday

# Expose service port
EXPOSE 8000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Set container resource limits
ENV MEMORY_LIMIT=1Gi \
    CPU_LIMIT=1.0 \
    MEMORY_REQUEST=512Mi \
    CPU_REQUEST=0.5

# Use tini as init system
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the application with gunicorn
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--log-level", "info", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "scenario_service.main:app"]