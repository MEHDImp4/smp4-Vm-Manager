const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db');
const emailService = require('../services/email.service');

const BCRYPT_SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';


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

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, name: user.name, email: user.email, points: user.points, role: user.role, isVerified: user.isVerified, token }
        });
    } catch (error) {
        console.error(error);
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

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                points: user.points,
                role: user.role,
                isVerified: user.isVerified,
                token
            }
        });
    } catch (error) {
        console.error(error);
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
        console.error(error);
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
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const uploadAvatar = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    // Normalized path for frontend access (assuming /uploads is served statically)
    const avatarUrl = `/uploads/${req.file.filename}`;

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl }
        });

        res.json({ message: 'Avatar updated', avatarUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getPointsHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const transactions = await prisma.pointTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 transactions
        });
        res.json(transactions);
    } catch (error) {
        console.error("History fetch error", error);
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
        console.error("Verification error", error);
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
        console.error("Resend code error", error);
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
        console.error('Error requesting account deletion:', error);
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
            include: { instances: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify code
        console.log('[Delete] Comparing codes:', { stored: user.verificationCode, received: code });
        const storedCode = String(user.verificationCode || '').trim();
        const receivedCode = String(code || '').trim();

        if (storedCode !== receivedCode) {
            console.log('[Delete] Code mismatch:', { storedCode, receivedCode });
            return res.status(400).json({ message: 'Code invalide' });
        }

        console.log('[Delete] Code verified, proceeding with account deletion for user:', userId);

        // Delete all user instances from Proxmox first
        const proxmox = require('../services/proxmox.service');
        for (const instance of user.instances) {
            if (instance.vmid) {
                try {
                    console.log(`[Delete] Stopping VM ${instance.vmid}...`);
                    try {
                        await proxmox.stopLXC(instance.vmid);
                    } catch (e) {
                        console.log(`[Delete] VM ${instance.vmid} already stopped or error:`, e.message);
                    }

                    console.log(`[Delete] Deleting VM ${instance.vmid}...`);
                    await proxmox.deleteLXC(instance.vmid);
                    console.log(`[Delete] VM ${instance.vmid} deleted from Proxmox`);
                } catch (error) {
                    console.error(`[Delete] Failed to delete VM ${instance.vmid}:`, error.message);
                    // Continue anyway - don't block user deletion on Proxmox errors
                }
            }
        }

        // Delete user from database (must delete related records first due to foreign key constraints)
        console.log('[Delete] Deleting user from database...');
        try {
            // Get all instance IDs for cascade deletion
            const instanceIds = user.instances.map(i => i.id);

            // Delete in correct order to avoid foreign key violations
            console.log('[Delete] Deleting snapshots...');
            await prisma.snapshot.deleteMany({ where: { instanceId: { in: instanceIds } } });

            console.log('[Delete] Deleting domains...');
            await prisma.domain.deleteMany({ where: { instanceId: { in: instanceIds } } });

            console.log('[Delete] Deleting instances...');
            await prisma.instance.deleteMany({ where: { userId } });

            console.log('[Delete] Deleting point transactions...');
            await prisma.pointTransaction.deleteMany({ where: { userId } });

            console.log('[Delete] Deleting daily spins...');
            await prisma.dailySpin.deleteMany({ where: { userId } });

            console.log('[Delete] Deleting social claims...');
            await prisma.socialClaim.deleteMany({ where: { userId } });

            console.log('[Delete] Finally deleting user...');
            await prisma.user.delete({ where: { id: userId } });
            console.log('[Delete] User deleted successfully');

            res.json({ message: 'Votre compte a été supprimé avec succès' });
        } catch (dbError) {
            console.error('[Delete] Database deletion error:', dbError);
            throw new Error('Impossible de supprimer le compte: ' + dbError.message);
        }
    } catch (error) {
        console.error('Error confirming account deletion:', error);
        res.status(500).json({
            message: 'Erreur lors de la suppression du compte',
            error: error.message
        });
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
    confirmAccountDeletion
};
