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

        console.log('[SSH] WebSocket server initialized on /ws/ssh');
    }

    /**
     * Create SSH session for a WebSocket connection
     */
    createSSHSession(ws, vmid, host) {
        const conn = new Client();
        const sessionId = `${vmid}-${Date.now()}`;
        let stream = null;

        // Auth state
        let pendingUsername = null;
        let passwordBuffer = '';
        let isCollectingPassword = false;

        // Password change state
        let isChangingPassword = false;
        let newPasswordBuffer = '';
        let confirmPasswordBuffer = '';
        let passwordChangeStep = 0; // 0=new, 1=confirm
        let passwordChangeDone = null;

        const attemptConnection = (username, password) => {
            console.log(`[SSH] Connecting to ${host} as ${username}...`);
            conn.connect({
                host: host,
                port: 22,
                username: username,
                password: password,
                tryKeyboard: true,
                readyTimeout: 10000,
                keepaliveInterval: 30000, // Send keepalive every 30 seconds
                keepaliveCountMax: 60 // 60 missed keepalives = 30 minutes timeout
            });
        };

        conn.on('ready', () => {
            console.log(`[SSH] Connected to ${host} for VM ${vmid}`);
            isCollectingPassword = false;
            isChangingPassword = false;
            ws.send(JSON.stringify({ type: 'connected' }));

            conn.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, s) => {
                if (err) {
                    ws.send(JSON.stringify({ type: 'error', message: err.message }));
                    ws.close();
                    return;
                }

                stream = s;
                this.sessions.set(sessionId, { conn, stream, ws });

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

        conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
            // Auto-reply with collected password if we have one
            console.log(`[SSH] Keyboard interactive prompt for ${vmid}`);
            finish(prompts.map(() => passwordBuffer));
        });

        // Handle password change required by server
        conn.on('change password', (message, done) => {
            console.log(`[SSH] Password change required for ${vmid}: ${message}`);
            isChangingPassword = true;
            isCollectingPassword = false;
            passwordChangeStep = 0;
            newPasswordBuffer = '';
            confirmPasswordBuffer = '';
            passwordChangeDone = done;

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'data', data: `\r\n${message}\r\nNew password: ` }));
            }
        });

        conn.on('error', (err) => {
            console.error(`[SSH] Connection error for ${vmid}:`, err.message);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: `SSH Error: ${err.message}` }));
            }
            setTimeout(() => ws.close(), 100);
        });

        // Handle WebSocket messages
        ws.on('message', (message) => {
            try {
                const msg = JSON.parse(message);

                if (msg.type === 'auth') {
                    // Start password collection
                    pendingUsername = msg.username;
                    isCollectingPassword = true;
                    passwordBuffer = '';

                    // Show password prompt to user
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'data', data: `\r\n${msg.username}@server's password: ` }));
                    }
                } else if (msg.type === 'input') {
                    if (isChangingPassword) {
                        // Password change flow
                        const char = msg.data;
                        if (char === '\r' || char === '\n') {
                            if (passwordChangeStep === 0) {
                                // New password entered, ask for confirmation
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({ type: 'data', data: '\r\nConfirm new password: ' }));
                                }
                                passwordChangeStep = 1;
                            } else {
                                // Confirmation entered
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({ type: 'data', data: '\r\n' }));
                                }
                                if (newPasswordBuffer === confirmPasswordBuffer) {
                                    // Passwords match, submit
                                    isChangingPassword = false;
                                    if (passwordChangeDone) {
                                        passwordChangeDone(newPasswordBuffer);
                                        passwordChangeDone = null;
                                    }
                                } else {
                                    // Passwords don't match
                                    if (ws.readyState === WebSocket.OPEN) {
                                        ws.send(JSON.stringify({ type: 'data', data: '\r\nPasswords do not match. New password: ' }));
                                    }
                                    passwordChangeStep = 0;
                                    newPasswordBuffer = '';
                                    confirmPasswordBuffer = '';
                                }
                            }
                        } else if (char === '\u007f') { // Backspace
                            if (passwordChangeStep === 0) {
                                if (newPasswordBuffer.length > 0) newPasswordBuffer = newPasswordBuffer.slice(0, -1);
                            } else {
                                if (confirmPasswordBuffer.length > 0) confirmPasswordBuffer = confirmPasswordBuffer.slice(0, -1);
                            }
                        } else {
                            if (passwordChangeStep === 0) {
                                newPasswordBuffer += char;
                            } else {
                                confirmPasswordBuffer += char;
                            }
                        }
                    } else if (isCollectingPassword) {
                        const char = msg.data;
                        if (char === '\r' || char === '\n') {
                            // Submit password
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'data', data: '\r\n' }));
                            }
                            isCollectingPassword = false;
                            attemptConnection(pendingUsername, passwordBuffer);
                        } else if (char === '\u007f') { // Backspace
                            if (passwordBuffer.length > 0) {
                                passwordBuffer = passwordBuffer.slice(0, -1);
                            }
                        } else {
                            passwordBuffer += char;
                            // Do NOT echo characters (password field)
                        }
                    } else if (stream) {
                        stream.write(msg.data);
                    }
                } else if (msg.type === 'resize') {
                    if (stream) stream.setWindow(msg.rows, msg.cols, 0, 0);
                }
            } catch (e) {
                console.error(e);
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
                debug: (msg) => console.log(`[SSH-DEBUG] ${msg}`)
            });
        });
    }
}

module.exports = new SSHService();
