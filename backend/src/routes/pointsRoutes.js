const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { 
    spinWheel, 
    canSpinToday, 
    purchasePoints, 
    claimSocialBonus 
} = require('../controllers/pointsController');

router.get('/can-spin', verifyToken, canSpinToday);
router.post('/spin', verifyToken, spinWheel);
router.post('/purchase', verifyToken, purchasePoints);
router.post('/social-bonus', verifyToken, claimSocialBonus);

module.exports = router;
