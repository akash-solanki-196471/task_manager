FROM node:20-alpine

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Install dependencies first (layer cache friendly)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source with correct ownership
COPY --chown=nodeuser:nodejs . .

USER nodeuser

EXPOSE 5001

ENV NODE_ENV=production PORT=5001

CMD ["node", "server.js"]
