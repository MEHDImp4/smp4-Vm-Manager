const express = require('express');
const cors = require('cors');
const proxmoxRoutes = require('./routes/proxmox.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/vms', proxmoxRoutes);

app.get('/', (req, res) => {
    res.send('SMP4 VM Manager API is running');
});

module.exports = app;
