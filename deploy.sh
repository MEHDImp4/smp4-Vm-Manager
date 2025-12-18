#!/bin/bash

# Define variables
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Starting deployment for SMP4 VM Manager..."

# Check if docker-compose.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found in current directory."
    exit 1
fi

# Determine which docker compose command to use
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "❌ Error: Neither 'docker compose' nor 'docker-compose' found."
    echo "Please install Docker Compose or the 'Docker Compose Manager' plugin in Unraid."
    exit 1
fi

echo "ℹ️ Using command: $DOCKER_COMPOSE_CMD"

# Pull latest images
echo "📥 Pulling latest images..."
$DOCKER_COMPOSE_CMD pull


# Build local images (like vpn)
echo "🔨 Building local images..."
$DOCKER_COMPOSE_CMD build

# Restart services
echo "🔄 Restarting services..."
$DOCKER_COMPOSE_CMD up -d --remove-orphans

# Show status
echo "✅ Deployment successful! Containers are running."
$DOCKER_COMPOSE_CMD ps
