const express = require('express');
const router = express.Router();
console.log('Proxmox Routes Loaded');
const proxmoxController = require('../controllers/proxmox.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     VM:
 *       type: object
 *       properties:
 *         vmid:
 *           type: integer
 *         name:
 *           type: string
 *         status:
 *           type: string
 *           enum: [running, stopped]
 *         cpus:
 *           type: integer
 *         lock:
 *           type: string
 *     NewVM:
 *       type: object
 *       required:
 *         - name
 *         - templateId
 *       properties:
 *         name:
 *           type: string
 *           description: Hostname for the new container
 *         templateId:
 *           type: integer
 *           description: ID of the template to clone from (e.g., 100, 101)
 *         storage:
 *           type: string
 *           default: local-lvm
 *         memory:
 *           type: integer
 *           description: MB of RAM (Optional override)
 *         cores:
 *           type: integer
 *           description: CPU Cores (Optional override)
 */

/**
 * @swagger
 * /api/vms:
 *   get:
 *     summary: List all LXC Containers
 *     tags: [VMs]
 *     responses:
 *       200:
 *         description: The list of VMs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VM'
 */
router.get('/', proxmoxController.list);

/**
 * @swagger
 * /api/vms/presets:
 *   get:
 *     summary: List available VM Templates/Plans
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: List of available templates with specs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   memory:
 *                     type: integer
 *                   cores:
 *                     type: integer
 *                   disk:
 *                     type: string
 */
router.get('/presets', proxmoxController.getTemplates);

/**
 * @swagger
 * /api/vms:
 *   post:
 *     summary: Create a new LXC Container
 *     tags: [VMs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewVM'
 *     responses:
 *       202:
 *         description: Creation started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: 
 *                   type: string
 *                 vmid:
 *                   type: integer
 *                 smp4Password:
 *                   type: string
 *                   description: The generated password for the smp4 user
 */
router.post('/', proxmoxController.createVM);

/**
 * @swagger
 * /api/vms/{vmid}/status:
 *   get:
 *     summary: Get status of a specific VM
 *     tags: [VMs]
 *     parameters:
 *       - in: path
 *         name: vmid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: VM Status
 */
router.get('/:vmid/status', proxmoxController.getStatus);

/**
 * @swagger
 * /api/vms/{vmid}/start:
 *   post:
 *     summary: Start a VM
 *     tags: [Actions]
 *     parameters:
 *       - in: path
 *         name: vmid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Start command sent
 */
router.post('/:vmid/start', proxmoxController.start);

/**
 * @swagger
 * /api/vms/{vmid}/stop:
 *   post:
 *     summary: Stop a VM
 *     tags: [Actions]
 *     parameters:
 *       - in: path
 *         name: vmid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stop command sent
 */
router.post('/:vmid/stop', proxmoxController.stop);

/**
 * @swagger
 * /api/vms/{vmid}:
 *   delete:
 *     summary: Delete a VM
 *     tags: [Actions]
 *     parameters:
 *       - in: path
 *         name: vmid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deletion command sent
 */
router.delete('/:vmid', proxmoxController.delete);

/**
 * @swagger
 * /api/vms/{vmid}/recreate:
 *   post:
 *     summary: Recreate a VM (Delete & Clone fresh)
 *     tags: [Actions]
 *     parameters:
 *       - in: path
 *         name: vmid
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateId:
 *                 type: integer
 *     responses:
 *       202:
 *         description: Recreation started
 */
router.post('/:vmid/recreate', proxmoxController.recreate);

module.exports = router;
