FROM node:18-alpine

# Install WireGuard tools and IPTables
RUN apk add --no-cache wireguard-tools iptables ip6tables openresolv

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev && \
    npm cache clean --force && \
    rm -rf /usr/local/lib/node_modules/npm /opt/yarn* /usr/local/lib/node_modules/corepack

# Copy source
COPY . .

# Create directory for WireGuard config
RUN mkdir -p /etc/wireguard

# Expose ports
EXPOSE 3001
EXPOSE 51821/udp

# Start script
CMD ["node", "src/index.js"]
