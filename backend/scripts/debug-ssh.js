const { Client } = require('ssh2');

const targetIp = process.argv[2];
const password = process.argv[3] || 'root'; // Default to root if not provided

if (!targetIp) {
    console.error("Usage: node debug-ssh.js <TARGET_IP> [PASSWORD]");
    process.exit(1);
}

console.log(`[DEBUG] Attempting SSH connection to ${targetIp} with password '${password}'...`);

const conn = new Client();

conn.on('ready', () => {
    console.log('[SSH SUCCESS] Client :: ready');
    conn.end();
}).on('error', (err) => {
    console.error(`[SSH ERROR] ${err.message}`);
    if (err.level) console.error(`[SSH LEVEL] ${err.level}`);
    if (err.description) console.error(`[SSH DESC] ${err.description}`);
}).on('close', () => {
    console.log('[SSH CLOSED] Connection closed');
}).on('banner', (msg) => {
    console.log(`[SSH BANNER] ${msg}`);
}).on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
    console.log('[SSH INTERACTIVE]');
    finish([password]);
}).connect({
    host: targetIp,
    port: 22,
    username: 'root',
    password: password,
    tryKeyboard: true,
    debug: (msg) => console.log(`[ssh2-debug] ${msg}`)
});
