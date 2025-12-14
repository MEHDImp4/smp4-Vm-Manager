const { Client } = require('ssh2');
const WebSocket = require('ws');

class SSHService {
    constructor() {
        this.sessions = new Map();
    }

    /**
     * Initialize WebSocket server for SSH terminals
     * @param {http.Server} server - HTTP server to attach to
     */
    init(server) {
        this.wss = new WebSocket.Server({
            server,
            path: '/ws/ssh'
        });

        this.wss.on('connection', (ws, req) => {
            console.log('[SSH] New WebSocket connection');

            // Parse query params for connection info
            const url = new URL(req.url, 'http://localhost');
            const vmid = url.searchParams.get('vmid');
            const host = url.searchParams.get('host');

            if (!vmid || !host) {
                ws.send(JSON.stringify({ type: 'error', message: 'Missing vmid or host parameter' }));
                ws.close();
                return;
            }

            this.createSSHSession(ws, vmid, host);
        });

        console.log('[SSH] WebSocket server initialized on /ws/ssh');
    }

    /**
     * Create SSH session for a WebSocket connection
     */
    createSSHSession(ws, vmid, host) {
        const conn = new Client();
        const sessionId = `${vmid}-${Date.now()}`;
        let stream = null;

        conn.on('ready', () => {
            console.log(`[SSH] Connected to ${host} for VM ${vmid}`);
            ws.send(JSON.stringify({ type: 'connected' }));

            conn.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, s) => {
                if (err) {
                    ws.send(JSON.stringify({ type: 'error', message: err.message }));
                    ws.close();
                    return;
                }

                stream = s;

                // Store session
                this.sessions.set(sessionId, { conn, stream, ws });

                // Data from SSH -> WebSocket
                stream.on('data', (data) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'data', data: data.toString('utf8') }));
                    }
                });

                stream.on('close', () => {
                    console.log(`[SSH] Stream closed for ${vmid}`);
                    this.cleanupSession(sessionId);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'disconnect' }));
                        ws.close();
                    }
                });
            });
        });

        conn.on('error', (err) => {
            console.error(`[SSH] Connection error for ${vmid}:`, err.message);
            // Ensure socket is open before sending
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `SSH Connect Failed: ${err.message}`
                }));
            }
            // Give it a moment to send before closing
            setTimeout(() => ws.close(), 100);
        });

        // Handle WebSocket messages (Authentication & Input)
        ws.on('message', (message) => {
            try {
                const msg = JSON.parse(message);

                if (msg.type === 'auth') {
                    // Authenticate and Connect
                    console.log(`[SSH] Authenticating to ${host} as ${msg.username}...`);
                    conn.connect({
                        host: host,
                        port: 22,
                        username: msg.username,
                        password: msg.password,
                        readyTimeout: 10000
                    });
                } else if (msg.type === 'input') {
                    if (stream) stream.write(msg.data);
                } else if (msg.type === 'resize') {
                    if (stream) stream.setWindow(msg.rows, msg.cols, 0, 0);
                }
            } catch (e) {
                // Raw data fallback if needed (though we expect JSON now)
            }
        });

        ws.on('close', () => {
            console.log(`[SSH] WebSocket closed for ${vmid}`);
            this.cleanupSession(sessionId);
        });
    }

    cleanupSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            try {
                session.stream.end();
                session.conn.end();
            } catch (e) { /* ignore */ }
            this.sessions.delete(sessionId);
        }
    }

    /**
     * Execute a command on a remote host via SSH
     * @returns {Promise<string>} stdout
     */
    async execCommand(host, command) {
        return new Promise((resolve, reject) => {
            const conn = new Client();

            conn.on('ready', () => {
                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }

                    let stdout = '';
                    let stderr = '';

                    stream.on('close', (code, signal) => {
                        conn.end();
                        if (code !== 0) {
                            reject(new Error(`Command failed with code ${code}: ${stderr}`));
                        } else {
                            resolve(stdout.trim());
                        }
                    }).on('data', (data) => {
                        stdout += data;
                    }).stderr.on('data', (data) => {
                        stderr += data;
                    });
                });
            }).on('error', (err) => {
                reject(err);
            }).connect({
                host: host,
                port: 22,
                username: 'root',
                password: process.env.LXC_SSH_PASSWORD || 'root',
                readyTimeout: 10000
            });
        });
    }
}

module.exports = new SSHService();
