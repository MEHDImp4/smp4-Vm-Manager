require('dotenv').config();
const http = require('http');
const app = require('./app');
const sshService = require('./services/ssh.service');

const PORT = process.env.PORT || 3000;

// Create HTTP server (needed for WebSocket attachment)
const server = http.createServer(app);

// Initialize SSH WebSocket service
sshService.init(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
