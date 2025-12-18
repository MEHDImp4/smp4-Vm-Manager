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

const deleteClient = async (publicKey) => {
    try {
        if (!publicKey) return;
        const encodedKey = encodeURIComponent(publicKey);
        console.log(`[VPN] Deleting client with key: ${publicKey}`);
        await axios.delete(`${VPN_API_URL}/client/${encodedKey}`);
    } catch (error) {
        console.error('[VPN] Failed to delete client:', error.message);
        // Don't throw, we want deletion to proceed even if VPN cleanup fails
    }
};

module.exports = {
    createClient,
    deleteClient
};
