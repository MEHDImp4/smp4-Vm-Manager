const { Client } = require('ssh2');
const WebSocket = require('ws');
const log = require('./logger.service');

class SSHSession {
    constructor(ws, vmid, host, onClose) {
        this.ws = ws;
        this.vmid = vmid;
        this.host = host;
        this.onClose = onClose;
        this.conn = new Client();
        this.stream = null;

        // Auth state
        this.pendingUsername = null;
        this.passwordBuffer = '';
        this.isCollectingPassword = false;

        // Password change state
        this.isChangingPassword = false;
        this.newPasswordBuffer = '';
        this.confirmPasswordBuffer = '';
        this.passwordChangeStep = 0; // 0=new, 1=confirm
        this.passwordChangeDone = null;

        this.initConnection();
    }

    initConnection() {
        this.conn.on('ready', () => this.handleReady());
        this.conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
            log.ssh(`Keyboard interactive prompt for ${this.vmid}`);
            finish(prompts.map(() => this.passwordBuffer));
        });
        this.conn.on('change password', (msg, done) => this.handleChangePassword(msg, done));
        this.conn.on('error', (err) => this.handleError(err));

        // Handle WebSocket messages
        this.ws.on('message', (message) => this.handleWebSocketMessage(message));
        this.ws.on('close', () => {
            log.ssh(`WebSocket closed for ${this.vmid}`);
            this.cleanup();
        });
    }

    attemptConnection(username, password) {
        log.ssh(`Connecting to ${this.host} as ${username}...`);
        this.conn.connect({
            host: this.host,
            port: 22,
            username: username,
            password: password,
            tryKeyboard: true,
            readyTimeout: 10000,
            keepaliveInterval: 30000,
            keepaliveCountMax: 60
        });
    }

    handleReady() {
        log.ssh(`Connected to ${this.host} for VM ${this.vmid}`);
        this.isCollectingPassword = false;
        this.isChangingPassword = false;
        this.sendJson({ type: 'connected' });

        this.conn.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, s) => {
            if (err) {
                this.sendJson({ type: 'error', message: err.message });
                this.ws.close();
                return;
            }

            this.stream = s;

            // Invoke callback to register session if needed (though we handle cleanup internally)
            // But we need to expose stream/conn to service? 
            // The service kept a map. We should replicate that or let service manage it.
            // For now, let's assume service just starts it.

            this.stream.on('data', (data) => {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.sendJson({ type: 'data', data: data.toString('utf8') });
                }
            });

            this.stream.on('close', () => {
                log.ssh(`Stream closed for ${this.vmid}`);
                this.cleanup();
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.sendJson({ type: 'disconnect' });
                    this.ws.close();
                }
            });
        });
    }

    handleChangePassword(message, done) {
        log.ssh(`Password change required for ${this.vmid}: ${message}`);
        this.isChangingPassword = true;
        this.isCollectingPassword = false;
        this.passwordChangeStep = 0;
        this.newPasswordBuffer = '';
        this.confirmPasswordBuffer = '';
        this.passwordChangeDone = done;

        this.sendJson({ type: 'data', data: `\r\n${message}\r\nNew password: ` });
    }

    handleError(err) {
        log.error(`[SSH] Connection error for ${this.vmid}: ${err.message}`);
        if (this.ws.readyState === WebSocket.OPEN) {
            this.sendJson({ type: 'error', message: `SSH Error: ${err.message}` });
        }
        setTimeout(() => this.ws.close(), 100);
    }

    handleWebSocketMessage(message) {
        try {
            const msg = JSON.parse(message);
            if (msg.type === 'auth') this.handleAuth(msg);
            else if (msg.type === 'input') this.handleInput(msg);
            else if (msg.type === 'resize') this.handleResize(msg);
        } catch (e) {
            log.error(`[SSH] ${e.message}`);
        }
    }

    handleAuth(msg) {
        this.pendingUsername = msg.username;
        this.isCollectingPassword = true;
        this.passwordBuffer = '';
        this.sendJson({ type: 'data', data: `\r\n${msg.username}@server's password: ` });
    }

    handleInput(msg) {
        if (this.isChangingPassword) {
            this.handlePasswordChangeInput(msg.data);
        } else if (this.isCollectingPassword) {
            this.handlePasswordCollectionInput(msg.data);
        } else if (this.stream) {
            this.stream.write(msg.data);
        }
    }

    handlePasswordCollectionInput(char) {
        if (char === '\r' || char === '\n') {
            this.sendJson({ type: 'data', data: '\r\n' });
            this.isCollectingPassword = false;
            this.attemptConnection(this.pendingUsername, this.passwordBuffer);
        } else if (char === '\u007f') { // Backspace
            if (this.passwordBuffer.length > 0) {
                this.passwordBuffer = this.passwordBuffer.slice(0, -1);
            }
        } else {
            this.passwordBuffer += char;
        }
    }

    handlePasswordChangeInput(char) {
        if (char === '\r' || char === '\n') {
            if (this.passwordChangeStep === 0) {
                this.sendJson({ type: 'data', data: '\r\nConfirm new password: ' });
                this.passwordChangeStep = 1;
            } else {
                this.sendJson({ type: 'data', data: '\r\n' });
                if (this.newPasswordBuffer === this.confirmPasswordBuffer) {
                    this.isChangingPassword = false;
                    if (this.passwordChangeDone) {
                        this.passwordChangeDone(this.newPasswordBuffer);
                        this.passwordChangeDone = null;
                    }
                } else {
                    this.sendJson({ type: 'data', data: '\r\nPasswords do not match. New password: ' });
                    this.passwordChangeStep = 0;
                    this.newPasswordBuffer = '';
                    this.confirmPasswordBuffer = '';
                }
            }
        } else if (char === '\u007f') {
            if (this.passwordChangeStep === 0) {
                if (this.newPasswordBuffer.length > 0) this.newPasswordBuffer = this.newPasswordBuffer.slice(0, -1);
            } else {
                if (this.confirmPasswordBuffer.length > 0) this.confirmPasswordBuffer = this.confirmPasswordBuffer.slice(0, -1);
            }
        } else {
            if (this.passwordChangeStep === 0) this.newPasswordBuffer += char;
            else this.confirmPasswordBuffer += char;
        }
    }

    handleResize(msg) {
        if (this.stream) this.stream.setWindow(msg.rows, msg.cols, 0, 0);
    }

    sendJson(data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    cleanup() {
        try {
            if (this.stream) this.stream.end();
            this.conn.end();
        } catch (e) { /* ignore */ }

        if (this.onClose) this.onClose();
    }
}

module.exports = SSHSession;
