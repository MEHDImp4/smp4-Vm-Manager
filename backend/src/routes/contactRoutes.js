const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken: authMiddleware } = require('../middlewares/authMiddleware');
const { validateBody, contactMessageSchema } = require('../middlewares/validation');

// Public route with validation
router.post('/', validateBody(contactMessageSchema), contactController.submitMessage);

// Admin routes
router.get('/', authMiddleware, contactController.getMessages);
router.delete('/:id', authMiddleware, contactController.deleteMessage);
router.put('/:id/read', authMiddleware, contactController.markAsRead);
router.post('/:id/reply', authMiddleware, contactController.replyMessage);

module.exports = router;

