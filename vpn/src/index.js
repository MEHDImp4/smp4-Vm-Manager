const express = require('express');
const bodyParser = require('body-parser');
const { execFile, spawn } = require('child_process');
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

// Input validation helpers
const isValidIP = (ip) => {
    if (!ip || typeof ip !== 'string') return false;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    const parts = ip.split('.').map(Number);
    return parts.every(p => p >= 0 && p <= 255);
};

const isValidWgKey = (key) => {
    if (!key || typeof key !== 'string') return false;
    // WireGuard keys are base64 encoded, 44 characters
    const keyRegex = /^[A-Za-z0-9+/]{43}=$/;
    return keyRegex.test(key.trim());
};

// Safe command execution helper using execFile (no shell interpolation)
const runExecFile = (cmd, args = []) => new Promise((resolve, reject) => {
    console.log(`[CMD] ${cmd} ${args.join(' ')}`);
    execFile(cmd, args, (error, stdout, stderr) => {
        if (error) {
            console.error(`[CMD ERROR] ${cmd}:`, stderr);
            reject(error);
        } else {
            resolve(stdout.trim());
        }
    });
});

// For piped commands, we use spawn with proper escaping
const runPipedCommand = (input, cmd, args = []) => new Promise((resolve, reject) => {
    console.log(`[CMD] echo "<input>" | ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
        if (code !== 0) {
            console.error(`[CMD ERROR] ${cmd}:`, stderr);
            reject(new Error(stderr || `Command failed with code ${code}`));
        } else {
            resolve(stdout.trim());
        }
    });

    child.stdin.write(input);
    child.stdin.end();
});

// For shell redirections, write to file manually instead
const runAndSaveOutput = async (cmd, args, outputFile) => {
    const output = await runExecFile(cmd, args);
    fs.writeFileSync(outputFile, output);
    return output;
};

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
            serverPrivateKey = await runExecFile('wg', ['genkey']);
            serverPublicKey = await runPipedCommand(serverPrivateKey, 'wg', ['pubkey']);
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
        } else {
            console.log('Ensuring config matches environment...');
            let configC = fs.readFileSync(WG_CONF, 'utf8');

            // Check/Update Port
            if (!configC.includes(`ListenPort = ${WG_PORT}`)) {
                console.log(`Updating ListenPort to ${WG_PORT}`);
                configC = configC.replace(/ListenPort = \d+/, `ListenPort = ${WG_PORT}`);
            }

            // Check/Update Address
            const addressRegex = /Address = [\d\.]+\/24/;
            if (!configC.includes(`Address = ${BASE_SUBNET}.1/24`)) {
                console.log(`Updating Address to ${BASE_SUBNET}.1/24`);
                configC = configC.replace(addressRegex, `Address = ${BASE_SUBNET}.1/24`);
            }

            fs.writeFileSync(WG_CONF, configC);
        }

        // Start Interface
        try {
            await runExecFile('wg-quick', ['up', WG_INTERFACE]);
        } catch (e) {
            console.log('Interface might be already up, attempting restart...');
            try {
                await runExecFile('wg-quick', ['down', WG_INTERFACE]);
                await runExecFile('wg-quick', ['up', WG_INTERFACE]);
            } catch (e2) {
                console.error('Failed to restart interface:', e2.message);
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
        const { targetIp } = req.body;

        // Validate targetIp to prevent injection
        if (!targetIp || !isValidIP(targetIp)) {
            return res.status(400).json({ error: 'Valid targetIp is required (e.g., 192.168.1.100)' });
        }

        // Generate Client Keys & PSK using secure execFile
        const clientPrivateKey = await runExecFile('wg', ['genkey']);
        const clientPublicKey = await runPipedCommand(clientPrivateKey, 'wg', ['pubkey']);
        const clientPresharedKey = await runExecFile('wg', ['genpsk']);

        // Validate generated keys
        if (!isValidWgKey(clientPublicKey)) {
            throw new Error('Failed to generate valid client public key');
        }

        // Allocate IP - get current peers
        const currentConf = await runExecFile('wg', ['show', WG_INTERFACE, 'allowed-ips']);
        const usedIps = currentConf.split('\n').map(line => {
            const parts = line.split('\t');
            if (parts.length > 1) return parts[1].split('/')[0];
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

        // Write PSK to temp file (wg set requires file for preshared-key)
        const pskFile = path.join('/tmp', `psk-${Date.now()}`);
        fs.writeFileSync(pskFile, clientPresharedKey, { mode: 0o600 });

        try {
            // Add Peer to WireGuard using execFile with proper arguments
            await runExecFile('wg', [
                'set', WG_INTERFACE,
                'peer', clientPublicKey,
                'allowed-ips', `${clientIp}/32`,
                'preshared-key', pskFile
            ]);
        } finally {
            // Always clean up PSK file
            if (fs.existsSync(pskFile)) {
                fs.unlinkSync(pskFile);
            }
        }

        // Persist configuration (write output to file instead of shell redirect)
        console.log('Persisting configuration...');
        await runAndSaveOutput('wg', ['showconf', WG_INTERFACE], WG_CONF);

        // Add Firewall Rule using execFile
        await runExecFile('iptables', [
            '-I', 'FORWARD', '1',
            '-i', WG_INTERFACE,
            '-s', clientIp,
            '-d', targetIp,
            '-j', 'ACCEPT'
        ]);

        // Generate Client Config
        const endpoint = process.env.VPN_ENDPOINT || 'azeur-ptero-node.smp4.xyz:51821';

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
app.delete('/client', async (req, res) => {
    try {
        let publicKey;

        // Option 1: Passed directly via query or body
        if (req.body.publicKey || req.query.publicKey) {
            publicKey = req.body.publicKey || req.query.publicKey;
        }
        // Option 2: Derive from Private Key
        else if (req.body.privateKey) {
            console.log('Deriving Public Key from provided Private Key...');
            const privateKey = req.body.privateKey.trim();

            // Validate private key format before processing
            if (!isValidWgKey(privateKey)) {
                return res.status(400).json({ error: 'Invalid privateKey format' });
            }

            publicKey = await runPipedCommand(privateKey, 'wg', ['pubkey']);
        }

        if (!publicKey) {
            return res.status(400).json({ error: 'publicKey or privateKey is required' });
        }

        const decodedKey = decodeURIComponent(publicKey).trim();

        // Validate public key format to prevent injection
        if (!isValidWgKey(decodedKey)) {
            return res.status(400).json({ error: 'Invalid publicKey format' });
        }

        console.log(`Removing peer ${decodedKey.slice(0, 8)}...`);

        // Use execFile with proper arguments (no shell interpolation)
        await runExecFile('wg', ['set', WG_INTERFACE, 'peer', decodedKey, 'remove']);

        // Persist configuration
        console.log('Persisting configuration...');
        await runAndSaveOutput('wg', ['showconf', WG_INTERFACE], WG_CONF);

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

