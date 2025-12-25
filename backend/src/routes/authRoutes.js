const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import validation middleware and schemas
const {
    validateBody,
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    updatePasswordSchema,
    confirmDeletionSchema
} = require('../middlewares/validation');

// Rate limiting for authentication routes to prevent brute force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        message: 'Too many authentication attempts, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiting for sensitive operations (password reset, account deletion)
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per hour
    message: {
        message: 'Too many attempts, please try again after 1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = '/data/uploads/';
        fs.mkdir(uploadDir, { recursive: true }, (err) => {
            if (err) {
                return cb(err);
            }
            cb(null, uploadDir);
        });
    },
    filename: (req, file, cb) => {
        // Unique filename: user-{id}-{timestamp}.ext
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed'));
    }
});

const { register, login, getProfile, updatePassword, uploadAvatar, getPointsHistory, verifyEmail, resendVerificationCode, requestAccountDeletion, confirmAccountDeletion, refreshToken } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public routes with rate limiting and validation
router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/verify-email', authLimiter, validateBody(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationCode);
router.post('/refresh-token', authLimiter, refreshToken);

// Protected routes
router.get('/me', verifyToken, getProfile);
router.put('/password', verifyToken, strictLimiter, validateBody(updatePasswordSchema), updatePassword);
router.post('/avatar', verifyToken, upload.single('avatar'), uploadAvatar);
router.put('/me/avatar', verifyToken, upload.single('avatar'), uploadAvatar);
router.get('/me/points-history', verifyToken, getPointsHistory);

// Sensitive operations with strict rate limiting and validation
router.post('/request-deletion', verifyToken, strictLimiter, requestAccountDeletion);
router.post('/confirm-deletion', verifyToken, strictLimiter, validateBody(confirmDeletionSchema), confirmAccountDeletion);

module.exports = router;

