const express = require('express');
const router = express.Router();
const proxmoxController = require('../controllers/proxmox.controller');

router.post('/', proxmoxController.createVM);
router.get('/:vmid/status', proxmoxController.getStatus);

module.exports = router;
