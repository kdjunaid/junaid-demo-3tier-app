# Multi-stage Dockerfile for Node.js Express Backend

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Run build scripts if you have any (uncomment if needed)
# RUN npm run build

# Install only production dependencies in a clean directory for production
RUN rm -rf node_modules && npm ci --omit=dev && npm cache clean --force

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory and non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

# Set working directory and fix ownership
WORKDIR /app
RUN chown -R nodeuser:nodejs /app

# Copy production dependencies from builder stage
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules

# # Copy package files
COPY --from=builder --chown=nodeuser:nodejs /app/package*.json ./

# Copy built application from builder stage
COPY --from=builder --chown=nodeuser:nodejs /app/*.js ./

# Switch to non-root user
USER nodeuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node healthcheck.js || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]