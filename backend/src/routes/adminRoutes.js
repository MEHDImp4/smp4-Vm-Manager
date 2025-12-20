const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middlewares/adminMiddleware');
const { verifyToken } = require('../middlewares/authMiddleware');

// All routes require authentication and admin role
router.use(verifyToken, adminMiddleware);

router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/instances', adminController.getAllInstances);
router.get('/node/stats', adminController.getNodeStats);

module.exports = router;
