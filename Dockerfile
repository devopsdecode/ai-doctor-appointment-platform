# ==============================================================================
# Production-Hardened Multi-Stage Dockerfile for Azure Microservice
# Built for deployment to Azure Kubernetes Service via GitHub Self-Hosted Runner
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependency Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies if needed (e.g. python, make, g++)
RUN apk add --no-cache libc6-compat

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 2: Hardened Runtime Container
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Set production environment
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

WORKDIR /usr/src/app

# Copy production node_modules from builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package.json ./

# Copy application source code and web assets
COPY src/ ./src/
COPY public/ ./public/

# Security hardening: Run as built-in non-root 'node' user (UID 1000)
RUN chown -R node:node /usr/src/app
USER node

# Document service port
EXPOSE 3000

# Container Healthcheck (Kubernetes also monitors /healthz and /readyz)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/healthz || exit 1

# Start Node.js application server
CMD ["node", "src/server.js"]
