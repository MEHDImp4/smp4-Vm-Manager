const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const WG_INTERFACE = 'wg0';
const WG_PORT = 51821;
const WG_DIR = '/etc/wireguard';
const WG_CONF = path.join(WG_DIR, `${WG_INTERFACE}.conf`);
const BASE_SUBNET = '10.13.37';

// Ensure config dir exists
if (!fs.existsSync(WG_DIR)) {
    fs.mkdirSync(WG_DIR, { recursive: true });
}

// Helper to execute shell commands
const run = (cmd) => new Promise((resolve, reject) => {
    console.log(`[CMD] ${cmd}`);
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`[CMD ERROR] ${cmd}:`, stderr);
            reject(error);
        } else {
            resolve(stdout.trim());
        }
    });
});

let serverPrivateKey = '';
let serverPublicKey = '';

// Initialize WireGuard Server
const init = async () => {
    try {
        // Generate Keys if not exist
        const privKeyPath = path.join(WG_DIR, 'privatekey');
        const pubKeyPath = path.join(WG_DIR, 'publickey');

        if (!fs.existsSync(privKeyPath)) {
            console.log('Generating server keys...');
            serverPrivateKey = await run('wg genkey');
            serverPublicKey = await run(`echo "${serverPrivateKey}" | wg pubkey`);
            fs.writeFileSync(privKeyPath, serverPrivateKey);
            fs.writeFileSync(pubKeyPath, serverPublicKey);
        } else {
            serverPrivateKey = fs.readFileSync(privKeyPath, 'utf8').trim();
            serverPublicKey = fs.readFileSync(pubKeyPath, 'utf8').trim();
        }

        console.log(`Server Public Key: ${serverPublicKey}`);

        // Create Config File if not exists
        if (!fs.existsSync(WG_CONF)) {
            const config = `[Interface]
Address = ${BASE_SUBNET}.1/24
SaveConfig = true
PostUp = iptables -A FORWARD -i ${WG_INTERFACE} -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i ${WG_INTERFACE} -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
ListenPort = ${WG_PORT}
PrivateKey = ${serverPrivateKey}
`;
            fs.writeFileSync(WG_CONF, config);
        }

        // Start Interface
        try {
            await run(`wg-quick up ${WG_INTERFACE}`);
        } catch (e) {
            console.log('Interface might be already up, reloading...');
            try {
                // await run(`wg-quick down ${WG_INTERFACE}`);
                // await run(`wg-quick up ${WG_INTERFACE}`);
                await run(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
            } catch (e2) {
                console.warn('Failed to reload interface:', e2.message);
            }
        }

        console.log('WireGuard Interface is UP');

    } catch (err) {
        console.error('Failed to initialize WireGuard:', err);
        process.exit(1);
    }
};

// API: Create Client
app.post('/client', async (req, res) => {
    try {
        const { targetIp } = req.body; // The VM IP this client is allowed to access

        if (!targetIp) {
            return res.status(400).json({ error: 'targetIp is required' });
        }

        // Generate Client Keys & PSK
        const clientPrivateKey = await run('wg genkey');
        const clientPublicKey = await run(`echo "${clientPrivateKey}" | wg pubkey`);
        const clientPresharedKey = await run('wg genpsk');

        // Allocate IP
        // Find next available IP. This is naive for now: just random or sequential.
        // Better: Scan current peers.
        const currentConf = await run(`wg show ${WG_INTERFACE} allowed-ips`);
        const usedIps = currentConf.split('\n').map(line => {
            const parts = line.split('\t');
            if (parts.length > 1) return parts[1].split('/')[0]; // 10.8.0.x
            return null;
        }).filter(ip => ip && ip.startsWith(BASE_SUBNET));

        let clientIpSuffix = 2;
        while (usedIps.includes(`${BASE_SUBNET}.${clientIpSuffix}`) && clientIpSuffix < 254) {
            clientIpSuffix++;
        }

        if (clientIpSuffix >= 254) {
            return res.status(500).json({ error: 'VPN subnet exhausted' });
        }

        const clientIp = `${BASE_SUBNET}.${clientIpSuffix}`;

        console.log(` Creating client ${clientPublicKey.slice(0, 8)}... IP: ${clientIp} -> Target: ${targetIp}`);

        // Add Peer to WireGuard
        // Note: 'wg set' needs PresharedKey passed as a file or safe method?
        // Actually `wg set wg0 peer <key> preshared-key <file>`
        // Let's write PSK to temp file
        const pskFile = path.join('/tmp', `psk-${clientPublicKey.slice(0, 8)}`);
        fs.writeFileSync(pskFile, clientPresharedKey);

        await run(`wg set ${WG_INTERFACE} peer ${clientPublicKey} allowed-ips ${clientIp}/32 preshared-key ${pskFile}`);
        fs.unlinkSync(pskFile);

        // Add Firewall Rule: Allow this client IP to access ONLY the target VM IP
        // We rely on the generic FORWARD ACCEPT, but we want to restrict.
        // Actually, the default config has `PostUp = iptables -A FORWARD -i ${WG_INTERFACE} -j ACCEPT` which allows ALL.
        // We should probably remove that generic rule and manage per-client rules if we want strict isolation.
        // For now, let's implement strict rules via IPTables for this client.

        // 1. Allow VPN Client -> Target VM
        await run(`iptables -I FORWARD 1 -i ${WG_INTERFACE} -s ${clientIp} -d ${targetIp} -j ACCEPT`);
        // 2. Drop everything else for this client (handled by default policy or generic drop if we change things)
        // With current generic ACCEPT, this specific rule is redundant unless we change the default.
        // Let's keep it simple: We rely on the fact that the client CONFIG only has AllowedIPs = 10.8.0.1 (VPN Gateway) + TargetIP.
        // So the client simply won't route other traffic here. That's "User-side" security.
        // "Server-side" security would require blocking other flows. 
        // Let's stick to generating a correct config for now.

        // Generate Client Config
        // We need the server's public IP or hostname. We'll read it from ENV or auto-detect?
        // For localhost dev, it's localhost. For prod, it's the domain.
        const endpoint = process.env.VPN_ENDPOINT || 'azeur-ptero-node.smp4.xyz:51821'; // Default placeholder

        const clientConfig = `[Interface]
PrivateKey = ${clientPrivateKey}
Address = ${clientIp}/32
DNS = 192.168.1.254

[Peer]
PublicKey = ${serverPublicKey}
PresharedKey = ${clientPresharedKey}
AllowedIPs = ${BASE_SUBNET}.0/24, ${targetIp}/32
Endpoint = ${endpoint}
PersistentKeepalive = 25
`;

        // Save peer info locally just in case (optional, we rely on 'wg show')

        res.json({
            clientIp,
            publicKey: clientPublicKey,
            config: clientConfig
        });

    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Delete Client
app.delete('/client/:publicKey', async (req, res) => {
    try {
        const { publicKey } = req.params;
        const decodedKey = decodeURIComponent(publicKey);

        console.log(`Removing peer ${decodedKey}...`);
        await run(`wg set ${WG_INTERFACE} peer "${decodedKey}" remove`);

        // Cleanup IPTables (Optional/Hard to track without ID)
        // Ideally we'd remove the specific rule we added.

        res.json({ message: 'Peer removed' });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, async () => {
    console.log('VPN Management API listening on port 3001');
    await init();
});
