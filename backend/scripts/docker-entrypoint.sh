#!/bin/sh
set -e

# Fix permissions for /data directory if it exists
if [ -d "/data" ]; then
    chown -R nodejs:nodejs /data
fi

# Switch to nodejs user
if [ "$(id -u)" = "0" ]; then
    exec su-exec nodejs "$@"
else
    exec "$@"
fi
