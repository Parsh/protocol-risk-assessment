# Production Dockerfile for DeFi Protocol Risk Assessment API
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Production stage
FROM python:3.11-alpine AS production

# Install Node.js and npm in the Python container
RUN apk add --no-cache nodejs npm

# Install system dependencies required for Slither
RUN apk add --no-cache \
    git \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    python3-dev \
    build-base

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install Slither and dependencies
RUN pip install --no-cache-dir \
    slither-analyzer==0.10.0 \
    crytic-compile==0.3.6 \
    solc-select==1.0.4

# Install and set Solidity compiler version
RUN solc-select install 0.8.19 && \
    solc-select use 0.8.19

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy additional configuration files
COPY --chown=nodejs:nodejs config/ ./config/
COPY --chown=nodejs:nodejs docker/slither/ ./slither-config/

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/tmp /app/logs && \
    chown -R nodejs:nodejs /app/data /app/tmp /app/logs

# Create data directory structure
RUN mkdir -p /app/data/{protocols,assessments,cache,logs,temp,backups} && \
    mkdir -p /app/data/cache/{etherscan,bscscan,polygonscan,defillama,coingecko,slither} && \
    chown -R nodejs:nodejs /app/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/v1/status', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/app.js"]
