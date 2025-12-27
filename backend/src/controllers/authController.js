const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db');
const emailService = require('../services/email.service');
const cloudflareService = require('../services/cloudflare.service');
const vpnService = require('../services/vpn.service');
const crypto = require('crypto');
const log = require('../services/logger.service');

// Generate Access (15m) and Refresh (7d) Tokens
const generateTokens = async (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
        data: {
            token: refreshTokenString,
            userId: user.id,
            expiresAt
        }
    });

    return { accessToken, refreshToken: refreshTokenString };
};

const BCRYPT_SALT_ROUNDS = 10;

// Ensure JWT_SECRET is configured - fail fast if not set
if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is required.');
}
const JWT_SECRET = process.env.JWT_SECRET;


const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
                points: 0.0
            }
        });

        // Send Verification Email
        await emailService.sendVerificationCode(user.email, user.name, user.verificationCode);

        // Send Verification Email
        await emailService.sendVerificationCode(user.email, user.name, user.verificationCode);

        const { accessToken, refreshToken } = await generateTokens(user);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                points: user.points,
                role: user.role,
                isVerified: user.isVerified,
                token: accessToken,
                refreshToken
            }
        });
    } catch (error) {
        log.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.isDeleted) {
            return res.status(403).json({ message: 'Account deleted' });
        }

        if (user.isBanned) {
            if (user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
                // Ban expired, unban user
                await prisma.user.update({
                    where: { id: user.id },
                    data: { isBanned: false, banReason: null, banExpiresAt: null }
                });
                user.isBanned = false; // Update local object for login
            } else {
                return res.status(403).json({
                    message: 'Account banned',
                    reason: user.banReason,
                    expiresAt: user.banExpiresAt
                });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = await generateTokens(user);

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                points: user.points,
                role: user.role,
                isVerified: user.isVerified,
                token: accessToken,
                refreshToken
            }
        });
    } catch (error) {
        log.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            points: user.points,
            role: user.role,
            isVerified: user.isVerified,
            avatarUrl: user.avatarUrl
        });
    } catch (error) {
        log.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        log.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const uploadAvatar = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;

    // Security Check: Validate file content (Magic Numbers)
    const { validateImageSignature } = require('../utils/fileValidation');
    const isValidSignature = await validateImageSignature(req.file.path);

    if (!isValidSignature) {
        // Delete the malicious/invalid file immediately
        const fs = require('fs');
        fs.unlink(req.file.path, (err) => {
            if (err) log.error('Error deleting invalid file:', err);
        });
        return res.status(400).json({ message: 'Invalid file content. Only real images are allowed.' });
    }

    // Normalized path for frontend access (assuming /uploads is served statically)
    const avatarUrl = `/uploads/${req.file.filename}`;

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl }
        });

        res.json({ message: 'Avatar updated', avatarUrl });
    } catch (error) {
        log.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getPointsHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        const { paginate } = require('../utils/pagination.utils');
        const result = await paginate(prisma.pointTransaction, {
            where: { userId },
            orderBy: { createdAt: 'desc' }
        }, { page: parseInt(page), limit: parseInt(limit) });

        res.json(result);
    } catch (error) {
        log.error("History fetch error", error);
        res.status(500).json({ message: "Failed to fetch points history" });
    }
};

const verifyEmail = async (req, res) => {
    const { email, code } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "Email already verified" });
        if (user.verificationCode !== code) return res.status(400).json({ message: "Invalid verification code" });

        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                isVerified: true,
                verificationCode: null,
                points: { increment: 100 }
            }
        });

        // Log transaction
        await prisma.pointTransaction.create({
            data: {
                userId: user.id,
                amount: 100,
                type: 'bonus'
            }
        });

        res.json({
            success: true,
            points: updatedUser.points,
            message: "Email verified! You received 90 bonus points."
        });

    } catch (error) {
        log.error("Verification error", error);
        res.status(500).json({ message: "Verification failed" });
    }
};

const resendVerificationCode = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "Email already verified" });

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();

        await prisma.user.update({
            where: { email },
            data: { verificationCode: newCode }
        });

        await emailService.sendVerificationCode(user.email, user.name, newCode);

        res.json({ message: "Verification code resent" });
    } catch (error) {
        log.error("Resend code error", error);
        res.status(500).json({ message: "Failed to resend code" });
    }
};

const requestAccountDeletion = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate deletion code
        const deletionCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Store code in user record
        await prisma.user.update({
            where: { id: userId },
            data: { verificationCode: deletionCode }
        });

        // Send email
        await emailService.sendAccountDeletionCode(user.email, user.name, deletionCode);

        res.json({ message: 'Code de suppression envoyé à votre email' });
    } catch (error) {
        log.error('Error requesting account deletion:', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi du code' });
    }
};

const confirmAccountDeletion = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Code requis' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { instances: { include: { domains: true } } }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify code
        const storedCode = String(user.verificationCode || '').trim();
        const receivedCode = String(code || '').trim();

        if (storedCode !== receivedCode) {
            log.auth('Code mismatch during deletion process'); // Cleaned sensitive data from logs
            return res.status(400).json({ message: 'Code invalide' });
        }

        log.auth(`Code verified, proceeding with account deletion for user: ${userId}`);

        // Delegate cleanup logic to service
        const accountCleanupService = require('../services/accountCleanup.service');
        await accountCleanupService.cleanupUserResources(userId, user.name, user.instances);

        res.json({ message: 'Votre compte a été supprimé avec succès' });

    } catch (error) {
        log.error('Error confirming account deletion:', error);
        res.status(500).json({
            message: 'Erreur lors de la suppression du compte',
            error: error.message
        });
    }
};

const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    try {
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });

        // Validate token
        if (!storedToken || storedToken.revoked || new Date() > new Date(storedToken.expiresAt)) {
            // Optional security: Revoke all tokens for this user if reuse detected
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        // Revoke the used refresh token (Rotation)
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true, replacedByToken: 'new_generated' }
        });

        // Generate new pair
        const newTokens = await generateTokens(storedToken.user);

        // Link old token to new one for audit
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { replacedByToken: newTokens.refreshToken }
        });

        res.json({
            token: newTokens.accessToken,
            refreshToken: newTokens.refreshToken
        });
    } catch (error) {
        log.error('Refresh token error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updatePassword,
    uploadAvatar,
    getPointsHistory,
    verifyEmail,
    resendVerificationCode,
    requestAccountDeletion,
    requestAccountDeletion,
    confirmAccountDeletion,
    refreshToken
};
