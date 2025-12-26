#!/bin/sh
# Install iptables
apk add --no-cache iptables

# wait for vpn interface?
sleep 5
echo "Applying VPN Masquerade Fix..."
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i wg0 -j ACCEPT
iptables -A FORWARD -o wg0 -j ACCEPT
echo "VPN Fix Applied."
# Keep container alive if needed, or exit if it's a one-off task. 
# Sidecar usually runs alongside. If we want it to run ONCE, we can just exit.
# But depends_on doesn't support waiting for completion easily in older compose.
# We'll just sleep infinity to be safe.
sleep infinity
