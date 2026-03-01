FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application code
COPY server.js ./
COPY public/ ./public/

# Cloud Run sets PORT env var (default 8080)
EXPOSE 8080

# Run as non-root user for security
USER node

CMD ["node", "server.js"]
