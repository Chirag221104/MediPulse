# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files strictly for caching
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user and logs directory
RUN addgroup -S medipulse && adduser -S medipulse -G medipulse \
    && mkdir -p /app/logs \
    && chown -R medipulse:medipulse /app

USER medipulse

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/app.js"]
