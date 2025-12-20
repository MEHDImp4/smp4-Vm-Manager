const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public route
router.post('/', contactController.submitMessage);

// Admin routes
router.get('/', authMiddleware, contactController.getMessages); // Need to add admin check inside or dedicated middleware
router.delete('/:id', authMiddleware, contactController.deleteMessage);
router.put('/:id/read', authMiddleware, contactController.markAsRead);
router.post('/:id/reply', authMiddleware, contactController.replyMessage);

module.exports = router;
