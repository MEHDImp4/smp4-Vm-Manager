const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
    spinWheel,
    canSpinToday,
    purchasePoints,
    claimSocialBonus
} = require('../controllers/pointsController');
const {
    validateBody,
    claimSocialBonusSchema,
    purchasePointsSchema
} = require('../middlewares/validation');

router.get('/can-spin', verifyToken, canSpinToday);
router.post('/spin', verifyToken, spinWheel);
router.post('/purchase', verifyToken, validateBody(purchasePointsSchema), purchasePoints);
router.post('/social-bonus', verifyToken, validateBody(claimSocialBonusSchema), claimSocialBonus);

module.exports = router;

