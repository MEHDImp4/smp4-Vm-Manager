FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for prisma) and OpenSSL for Alpine Compatibility
RUN apk add --no-cache openssl && npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src/
COPY .env* ./

# Check if we need to expose a port (defaulting to 3000, but will be overriden by docker-compose)
EXPOSE 3000

CMD ["npm", "start"]
