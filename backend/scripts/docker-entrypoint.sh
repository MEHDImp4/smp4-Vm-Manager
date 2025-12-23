#!/bin/sh
set -e

# Fix permissions on /data directory
if [ -d "/data" ]; then
    chown -R nodejs:nodejs /data
fi

# Execute the command as nodejs user
exec su-exec nodejs "$@"
