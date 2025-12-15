const express = require('express');
const router = express.Router();
const { createInstance, getInstances, toggleInstanceStatus, deleteInstance, getInstanceStats } = require('../controllers/instanceController');
const { verifyToken } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(verifyToken);

router.get('/', getInstances);
router.post('/', createInstance);
router.put('/:id/toggle', toggleInstanceStatus);
router.post('/:id/restart', require('../controllers/instanceController').restartInstance);
router.get('/:id/stats', getInstanceStats); // NEW stats endpoint
router.delete('/:id', deleteInstance);

module.exports = router;
