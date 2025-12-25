const net = require('net');
const { exec } = require('child_process');

const targetIp = process.argv[2];

if (!targetIp) {
    console.error("Usage: node debug-net.js <TARGET_IP>");
    process.exit(1);
}

console.log(`[DEBUG] Testing connectivity to ${targetIp}...`);

// 1. Ping Test
console.log(`[1] Pinging ${targetIp}...`);
exec(`ping -c 3 ${targetIp}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`[PING FAILED] ${stderr || error.message}`);
    } else {
        console.log(`[PING SUCCESS]\n${stdout}`);
    }

    // 2. TCP Port 22 Test
    console.log(`[2] Testing TCP Port 22...`);
    const socket = new net.Socket();
    const start = Date.now();

    socket.setTimeout(5000);
    socket.on('connect', () => {
        console.log(`[TCP SUCCESS] Connected to ${targetIp}:22 in ${Date.now() - start}ms`);
        socket.destroy();
    });
    socket.on('timeout', () => {
        console.error(`[TCP TIMEOUT] Could not connect to ${targetIp}:22`);
        socket.destroy();
    });
    socket.on('error', (err) => {
        console.error(`[TCP ERROR] ${err.message}`);
    });

    socket.connect(22, targetIp);
});
