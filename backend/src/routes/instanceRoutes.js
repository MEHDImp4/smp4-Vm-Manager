const express = require('express');
const router = express.Router();
const { createInstance, getInstances, toggleInstanceStatus, deleteInstance, getInstanceStats } = require('../controllers/instanceController');
const { createSnapshot, getSnapshots, restoreSnapshot, deleteSnapshot, downloadSnapshot } = require('../controllers/snapshotController');
const { verifyToken } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(verifyToken);

router.get('/', getInstances);
router.post('/', createInstance);
router.put('/:id/toggle', toggleInstanceStatus);
router.post('/:id/restart', require('../controllers/instanceController').restartInstance);
router.get('/:id/stats', getInstanceStats);
router.delete('/:id', deleteInstance);

// Snapshot routes
router.post('/:id/snapshots', createSnapshot);
router.get('/:id/snapshots', getSnapshots);
router.post('/:id/snapshots/:snapId/restore', restoreSnapshot);
router.delete('/:id/snapshots/:snapId', deleteSnapshot);
router.get('/:id/snapshots/:snapId/download', downloadSnapshot);

module.exports = router;

