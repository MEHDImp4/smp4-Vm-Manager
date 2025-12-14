const express = require('express');
const cors = require('cors');
const proxmoxRoutes = require('./routes/proxmox.routes');

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const app = express();

app.use(cors());
app.use(express.json());

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

console.log('Registering /api/vms routes');
app.use('/api/vms', proxmoxRoutes);

app.get('/', (req, res) => {
    res.redirect('/api-docs'); // Redirect root to docs
});

module.exports = app;
