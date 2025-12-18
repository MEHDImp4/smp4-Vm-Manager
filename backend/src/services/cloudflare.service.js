const axios = require('axios');

const CF_API_URL = 'https://api.cloudflare.com/client/v4';

// Credentials from environment variables
// Credentials from environment variables
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID ? process.env.CF_ACCOUNT_ID.trim().replace(/\.$/, '') : null;
const API_TOKEN = process.env.CF_API_TOKEN ? process.env.CF_API_TOKEN.trim() : null;
const TUNNEL_ID = process.env.CF_TUNNEL_ID ? process.env.CF_TUNNEL_ID.trim() : null;

const client = axios.create({
    baseURL: CF_API_URL,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

const CloudflareService = {
    /**
     * Add a new ingress rule to the Cloudflare Tunnel
     * @param {string} hostname - Full hostname (e.g. app.smp4.xyz)
     * @param {string} serviceUrl - Service URL (e.g. http://192.168.1.50:8080)
     */
    addTunnelIngress: async (hostname, serviceUrl) => {
        if (!ACCOUNT_ID || !API_TOKEN || !TUNNEL_ID) {
            throw new Error("Missing Cloudflare credentials");
        }

        try {
            // 1. Get current configuration
            // Defensive check for client before calling .get()
            if (!client || typeof client.get !== 'function') {
                throw new Error('Cloudflare API client is not properly initialized');
            }
            const configResponse = await client.get(`/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations`);
            const currentConfig = configResponse.data.result.config || {};

            // 2. Prepare new ingress rule
            const newIngressRule = {
                hostname: hostname,
                service: serviceUrl
            };

            // 3. Insert or Init Ingress
            let ingress = currentConfig.ingress ? [...currentConfig.ingress] : [];

            // Find 404 rule index
            const catchAllIndex = ingress.findIndex(r => r.service === 'http_status:404');

            if (catchAllIndex !== -1) {
                // Insert before catch-all
                ingress.splice(catchAllIndex, 0, newIngressRule);
            } else {
                // If no catch-all, append rule AND add catch-all
                ingress.push(newIngressRule);
                ingress.push({ service: 'http_status:404' });
            }

            // 4. Update configuration
            await client.put(`/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations`, {
                config: {
                    ...currentConfig,
                    ingress: ingress
                }
            });

            console.log(`[Cloudflare] Added ingress for ${hostname} -> ${serviceUrl}`);
            return true;
        } catch (error) {
            console.error("[Cloudflare] Error adding ingress:", error.response?.data || error.message);
            throw new Error("Failed to configure Cloudflare Tunnel");
        }
    },

    /**
     * Remove an ingress rule by hostname
     * @param {string} hostname 
     */
    removeTunnelIngress: async (hostname) => {
        if (!ACCOUNT_ID || !API_TOKEN || !TUNNEL_ID) {
            throw new Error("Missing Cloudflare credentials");
        }

        try {
            // Defensive check for client before calling .get()
            if (!client || typeof client.get !== 'function') {
                throw new Error('Cloudflare API client is not properly initialized');
            }
            const configResponse = await client.get(`/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations`);
            const currentConfig = configResponse.data.result.config;

            const newIngress = currentConfig.ingress.filter(r => r.hostname !== hostname);

            if (newIngress.length === currentConfig.ingress.length) {
                console.log(`[Cloudflare] No rule found for ${hostname}`);
                return false;
            }

            await client.put(`/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/configurations`, {
                config: {
                    ...currentConfig,
                    ingress: newIngress
                }
            });

            console.log(`[Cloudflare] Removed ingress for ${hostname}`);
            return true;
        } catch (error) {
            console.error("[Cloudflare] Error removing ingress:", error.response?.data || error.message);
            throw new Error("Failed to update Cloudflare Tunnel");
        }
    }
};

module.exports = CloudflareService;
