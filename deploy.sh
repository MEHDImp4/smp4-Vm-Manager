#!/bin/bash

# Define variables
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Starting deployment for SMP4 VM Manager..."

# Check if docker-compose.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found in current directory."
    exit 1
fi

# Pull latest images
echo "📥 Pulling latest images..."
docker compose pull

# Restart services
echo "🔄 Restarting services..."
docker compose up -d --remove-orphans

# Show status
echo "✅ Deployment successful! Containers are running."
docker compose ps
