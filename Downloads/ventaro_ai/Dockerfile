# Ventaro AI - Multi-stage Production Dockerfile
# Optimized for performance, security, and minimal size

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ventaro -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    cairo \
    jpeg \
    pango \
    musl \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    ffmpeg \
    imagemagick \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=ventaro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ventaro:nodejs /app/dist ./dist
COPY --from=builder --chown=ventaro:nodejs /app/public ./public
COPY --from=builder --chown=ventaro:nodejs /app/package*.json ./
COPY --from=builder --chown=ventaro:nodejs /app/server.js ./
COPY --from=builder --chown=ventaro:nodejs /app/backend ./backend
COPY --from=builder --chown=ventaro:nodejs /app/frontend ./frontend

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/data /app/models /app/edge-data && \
    chown -R ventaro:nodejs /app

# Switch to non-root user
USER ventaro

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# Development stage
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    git \
    openssh

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Create directories
RUN mkdir -p logs uploads data models edge-data

# Expose ports for development
EXPOSE 3000 8080 8090 5683 4840

# Start development server
CMD ["npm", "run", "dev"]

# Testing stage
FROM development AS testing

# Run tests
RUN npm test

# Run linting
RUN npm run lint

# Run security audit
RUN npm audit --audit-level moderate

# AI/ML stage with GPU support
FROM nvidia/cuda:11.8-runtime-ubuntu20.04 AS ai-gpu

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install Python and AI dependencies
RUN apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Install TensorFlow GPU
RUN pip3 install tensorflow-gpu torch torchvision torchaudio

# Set working directory
WORKDIR /app

# Copy application
COPY --from=builder /app .

# Install GPU-specific packages
RUN npm install @tensorflow/tfjs-node-gpu

# Expose port
EXPOSE 3000

# Start with GPU support
CMD ["node", "server.js"]

# Edge computing stage
FROM alpine:3.18 AS edge

# Install minimal runtime
RUN apk add --no-cache \
    nodejs \
    npm \
    dumb-init \
    curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ventaro -u 1001

# Set working directory
WORKDIR /app

# Copy minimal application for edge deployment
COPY --from=builder --chown=ventaro:nodejs /app/package*.json ./
COPY --from=builder --chown=ventaro:nodejs /app/backend/edge ./backend/edge
COPY --from=builder --chown=ventaro:nodejs /app/backend/ai ./backend/ai
COPY --from=builder --chown=ventaro:nodejs /app/node_modules ./node_modules

# Create edge-specific directories
RUN mkdir -p /app/edge-data /app/models /app/logs && \
    chown -R ventaro:nodejs /app

# Switch to non-root user
USER ventaro

# Expose edge computing ports
EXPOSE 8090 5683

# Health check for edge node
HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=2 \
    CMD curl -f http://localhost:8090/health || exit 1

# Start edge computing node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/edge/edge-computing.js"]

# Microservices stage
FROM node:18-alpine AS microservice

# Install dependencies
RUN apk add --no-cache dumb-init curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ventaro -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY --chown=ventaro:nodejs . .

# Create directories
RUN mkdir -p logs data && chown -R ventaro:nodejs /app

# Switch to non-root user
USER ventaro

# Default microservice port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start microservice
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# Security scanning stage
FROM aquasec/trivy:latest AS security-scan

# Copy application for security scanning
COPY --from=builder /app /scan

# Run security scan
RUN trivy fs --exit-code 1 --severity HIGH,CRITICAL /scan

# Final production image with security hardening
FROM production AS final

# Add security labels
LABEL maintainer="Ventaro AI Team <team@ventaro.ai>" \
      version="1.0.0" \
      description="Ventaro AI Platform - Production Ready" \
      security.scan="enabled" \
      org.opencontainers.image.source="https://github.com/ventaro-ai/platform"

# Security hardening
RUN apk add --no-cache \
    ca-certificates \
    && update-ca-certificates

# Remove unnecessary packages
RUN apk del --purge \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Set security-focused environment variables
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_PROGRESS=false \
    NODE_OPTIONS="--max-old-space-size=2048" \
    UV_THREADPOOL_SIZE=4

# Final health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "server.js"]