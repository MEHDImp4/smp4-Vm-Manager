const express = require('express');
const router = express.Router();
const { createInstance, getInstances, toggleInstanceStatus, deleteInstance, getInstanceStats, createDomain, getDomains, deleteDomain } = require('../controllers/instanceController');
const { createSnapshot, getSnapshots, restoreSnapshot, deleteSnapshot, downloadSnapshot } = require('../controllers/snapshotController');
const { verifyToken } = require('../middlewares/authMiddleware');
const {
    validateBody,
    createInstanceSchema,
    createDomainSchema,
    createSnapshotSchema
} = require('../middlewares/validation');

// All routes require authentication
router.use(verifyToken);

router.get('/', getInstances);
router.post('/', validateBody(createInstanceSchema), createInstance);
router.post('/:id/toggle', require('../controllers/instanceController').togglePower);

router.post('/:id/restart', require('../controllers/instanceController').restartInstance);
router.get('/:id/stats', getInstanceStats);

router.delete('/:id', deleteInstance);
// Upgrade route
router.post('/:instanceId/upgrade', require('../controllers/upgradeController').applyUpgrade);

// Snapshot routes
router.post('/:id/snapshots', validateBody(createSnapshotSchema), createSnapshot);
router.get('/:id/snapshots', getSnapshots);
router.post('/:id/snapshots/:snapId/restore', restoreSnapshot);
router.delete('/:id/snapshots/:snapId', deleteSnapshot);
router.get('/:id/snapshots/:snapId/download', downloadSnapshot);
router.delete('/:id/backups', require('../controllers/snapshotController').deleteBackup);

// Domain routes
router.post('/:id/domains', validateBody(createDomainSchema), createDomain);
router.get('/:id/domains', getDomains);
router.delete('/:id/domains/:domainId', deleteDomain);

module.exports = router;


