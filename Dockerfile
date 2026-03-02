FROM node:22-alpine

WORKDIR /app

# Native build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application code
COPY server.js db.js ./
COPY public/ ./public/

# Create data directory for SQLite
RUN mkdir -p /data && chown node:node /data

# Cloud Run sets PORT env var (default 8080)
EXPOSE 8080

# Run as non-root user for security
USER node

CMD ["node", "server.js"]
