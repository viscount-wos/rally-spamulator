FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Pure-JS dependencies only (express + compression): no build tools needed.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY public/ ./public/

# Cloud Run sets PORT (default 8080)
ENV PORT=8080
EXPOSE 8080

USER node

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "server.js"]
