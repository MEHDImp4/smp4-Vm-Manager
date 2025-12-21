const axios = require('axios');

const VPN_API_URL = 'http://smp4-vpn:3001'; // Internal Docker DNS

const createClient = async (targetIp) => {
    try {
        console.log(`[VPN] Creating client for target IP: ${targetIp}`);
        const response = await axios.post(`${VPN_API_URL}/client`, { targetIp });
        return response.data; // { clientIp, publicKey, config }
    } catch (error) {
        console.error('[VPN] Failed to create client:', error.message);
        throw error;
    }
};

const deleteClient = async (vpnConfig) => {
    try {
        if (!vpnConfig) return;

        // Parse PrivateKey from config string
        // Format: PrivateKey = <key>
        const match = vpnConfig.match(/PrivateKey\s*=\s*(.*)/);
        if (!match || !match[1]) {
            console.warn('[VPN] Could not find PrivateKey in config to perform deletion');
            return;
        }

        const privateKey = match[1].trim();

        console.log(`[VPN] Deleting client...`);
        // Use data payload for privateKey
        await axios.delete(`${VPN_API_URL}/client`, { data: { privateKey } });

    } catch (error) {
        console.error('[VPN] Failed to delete client:', error.message);
        // Don't throw, we want deletion to proceed
    }
};

// ============================================================================
// Circuit Breaker Wrapper
// ============================================================================

const { wrapWithBreaker } = require('../utils/circuit-breaker.utils');

module.exports = {
    createClient: wrapWithBreaker(
        createClient,
        'createClient', 'vpn'
    ),
    deleteClient: wrapWithBreaker(
        deleteClient,
        'deleteClient', 'vpn'
    ),
};
