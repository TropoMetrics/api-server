
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Kopieer package files
COPY package*.json ./

# Installeer dependencies
RUN npm install --omit=dev

# Kopieer applicatie code
COPY server.js ./

# Expose poort
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start applicatie
CMD ["node", "server.js"]
