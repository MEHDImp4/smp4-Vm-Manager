const { Client } = require('ssh2');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const log = require('./logger.service');

class SSHService {
    constructor() {
        this.sessions = new Map();
    }

    /**
     * Initialize WebSocket server for SSH terminals
     * @param {http.Server} server - HTTP server to attach to
     */
    init(server) {
        // Ensure JWT_SECRET is available
        if (!process.env.JWT_SECRET) {
            log.error('[SSH] CRITICAL: JWT_SECRET not defined. SSH service may not be secure.');
        }

        this.wss = new WebSocket.Server({
            server,
            path: '/ws/ssh',
            verifyClient: (info, cb) => {
                const url = new URL(info.req.url, 'http://localhost');
                const token = url.searchParams.get('token');

                if (!token) {
                    log.warn('[SSH] Access denied: No token provided');
                    return cb(false, 401, 'Unauthorized: No token provided');
                }

                try {
                    jwt.verify(token, process.env.JWT_SECRET);
                    // Token is valid
                    return cb(true);
                } catch (err) {
                    log.warn(`[SSH] Access denied: Invalid token ${err.message}`);
                    return cb(false, 403, 'Forbidden: Invalid token');
                }
            }
        });

        this.wss.on('connection', (ws, req) => {
            log.ssh('New WebSocket connection');

            // Parse query params for connection info
            const rawUrl = (req && typeof req.url === 'string') ? req.url : '';
            let url;
            try {
                url = new URL(rawUrl || '/ws/ssh', 'http://localhost');
            } catch {
                url = new URL('/ws/ssh', 'http://localhost');
            }
            const vmid = url && url.searchParams ? url.searchParams.get('vmid') : null;
            const host = url && url.searchParams ? url.searchParams.get('host') : null;

            if (!vmid || !host) {
                ws.send(JSON.stringify({ type: 'error', message: 'Missing vmid or host parameter' }));
                ws.close();
                return;
            }

            this.createSSHSession(ws, vmid, host);
        });

        log.info('[SSH] WebSocket server initialized on /ws/ssh with JWT protection');
    }

    /**
     * Create SSH session for a WebSocket connection
     */
    createSSHSession(ws, vmid, host) {
        const SSHSession = require('./ssh.session');
        const sessionId = `${vmid}-${Date.now()}`;

        const session = new SSHSession(ws, vmid, host, () => {
            this.cleanupSession(sessionId);
        });

        // Store session for management if needed (though SSHSession handles its own cleanup triggering)
        // We preserve this map structure from original code
        this.sessions.set(sessionId, session);
    }

    cleanupSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            // session.cleanup() is called by the session itself primarily, 
            // but if called externally we should ensure it stops.
            // Since our new SSHSession has a cleanup method:
            if (typeof session.cleanup === 'function') {
                session.cleanup();
            }
            this.sessions.delete(sessionId);
        }
    }

    /**
     * Execute a command on a remote host via SSH
     * @returns {Promise<string>} stdout
     */
    async execCommand(host, command, { username = 'root', password } = {}) {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            const authPassword = password || process.env.LXC_SSH_PASSWORD || 'root';

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
            }).on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
                // Auto-reply to prompts with the password
                finish(prompts.map(() => authPassword));
            }).on('error', (err) => {
                reject(err);
            }).connect({
                host: host,
                port: 22,
                username: username,
                password: authPassword,
                tryKeyboard: true,
                readyTimeout: 10000,
                keepaliveInterval: 30000,
                keepaliveCountMax: 60,
                debug: (msg) => log.debug(`[SSH-DEBUG] ${msg}`)
            });
        });
    }
}

module.exports = new SSHService();
