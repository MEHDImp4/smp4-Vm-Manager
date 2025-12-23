const express = require('express');
const router = express.Router();
const { getPacks } = require('../controllers/upgradeController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getPacks);

module.exports = router;
