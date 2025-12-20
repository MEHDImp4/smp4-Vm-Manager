const { prisma } = require('../db');
const emailService = require('../services/email.service');

const SPIN_PRIZES = [10, 15, 20, 25, 30, 40, 50, 75, 100, 125, 150, 200];
const SPIN_WEIGHTS = [15, 14, 13, 12, 10, 8, 7, 6, 5, 4, 3, 3]; // Adjusted weights

// Daily Spin Wheel
const spinWheel = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user already spun in the last 24h
        const lastSpin = await prisma.dailySpin.findFirst({
            where: { userId },
            orderBy: { spinDate: 'desc' }
        });

        if (lastSpin) {
            const nextSpinDate = new Date(lastSpin.spinDate.getTime() + 24 * 60 * 60 * 1000); // +24 hours
            if (new Date() < nextSpinDate) {
                return res.status(400).json({
                    error: "Vous devez attendre 24h entre chaque tour !",
                    nextSpinIn: nextSpinDate.getTime() - new Date().getTime()
                });
            }
        }

        // Generate random points using weighted prizes
        const possiblePrizes = SPIN_PRIZES;
        const weights = SPIN_WEIGHTS;
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        let random = Math.random() * totalWeight;
        let wonPoints = possiblePrizes[0];

        for (let i = 0; i < possiblePrizes.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                wonPoints = possiblePrizes[i];
                break;
            }
        }

        // Update user points and record spin
        const [updatedUser] = await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { points: { increment: wonPoints } }
            }),
            prisma.dailySpin.create({
                data: {
                    userId,
                    points: wonPoints
                }
            }),
            prisma.pointTransaction.create({
                data: {
                    userId,
                    amount: wonPoints,
                    type: 'spin'
                }
            })
        ]);

        // Send confirmation email
        try {
            if (req.user.email) {
                // Next spin is exactly 24h from now
                const nextSpinTime = new Date();
                nextSpinTime.setDate(nextSpinTime.getDate() + 1);
                // nextSpinTime.setHours(0, 0, 0, 0); // Removed midnight logic
                const nextSpinStr = nextSpinTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const nextSpinDateStr = nextSpinTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

                await emailService.sendEmail(
                    req.user.email,
                    "🎉 Vous avez gagné des points !",
                    `<div style="font-family: sans-serif; color: #333;">
                        <h2>Félicitations ! 🎁</h2>
                        <p>Vous avez gagné <strong>${wonPoints} points</strong> sur la roue quotidienne SMP4.</p>
                        <p>Votre nouveau solde : <strong>${updatedUser.points} points</strong>.</p>
                        <p>Vous pourrez tourner la roue à nouveau le <strong>${nextSpinDateStr} à ${nextSpinStr}</strong> !</p>
                        <br/>
                        <a href="https://smp4.xyz" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Revenir sur SMP4</a>
                    </div>`
                );
            }
        } catch (emailErr) {
            console.error("Failed to send spin email:", emailErr);
        }

        res.json({
            success: true,
            points: wonPoints,
            message: `Félicitations ! Vous avez gagné ${wonPoints} points !`
        });

    } catch (error) {
        console.error("Spin error:", error);
        res.status(500).json({ error: "Erreur lors du tirage" });
    }
};

// Check if user can spin today
const canSpinToday = async (req, res) => {
    try {
        const userId = req.user.id;

        const lastSpin = await prisma.dailySpin.findFirst({
            where: { userId },
            orderBy: { spinDate: 'desc' }
        });

        let canSpin = true;
        let nextSpinIn = 0;

        if (lastSpin) {
            const nextSpinDate = new Date(lastSpin.spinDate.getTime() + 24 * 60 * 60 * 1000);
            if (new Date() < nextSpinDate) {
                canSpin = false;
                nextSpinIn = nextSpinDate.getTime() - new Date().getTime();
            }
        }

        res.json({
            canSpin: canSpin,
            nextSpinIn: nextSpinIn,
            lastSpin: lastSpin ? lastSpin.spinDate : null
        });

    } catch (error) {
        console.error("Check spin error:", error);
        res.status(500).json({ error: "Erreur" });
    }
};

// Purchase points (Stripe integration placeholder)
const purchasePoints = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body; // Amount in USD (1, 2, 5, 10)

        // Validate amount
        const validAmounts = [1, 2, 5, 10]; // Max 2000 points = $10
        if (!validAmounts.includes(amount)) {
            return res.status(400).json({ error: "Montant invalide" });
        }

        let pointsToAdd = amount * 300; // 1$ = 300 points

        // Add bonus points
        if (amount === 5) pointsToAdd += 100;
        if (amount === 10) pointsToAdd += 200;

        // Placeholder response until payment integration is added
        res.json({
            success: true,
            message: "Paiement non disponible, intégration à venir",
            amount,
            points: pointsToAdd,
            paymentUrl: null
        });

    } catch (error) {
        console.error("Purchase error:", error);
        res.status(500).json({ error: "Erreur lors de l'achat" });
    }
};

// Social media bonus (one-time per platform)
const claimSocialBonus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { platform, username } = req.body; // "twitter", "github", "linkedin"

        const validPlatforms = {
            twitter: 50,
            github: 50,
            linkedin: 50
        };

        if (!validPlatforms[platform]) {
            return res.status(400).json({ error: "Plateforme invalide" });
        }

        if (!username || username.trim().length < 2) {
            return res.status(400).json({ error: "Nom d'utilisateur requis" });
        }

        // Check if already claimed in SocialClaim table
        const existingClaim = await prisma.socialClaim.findUnique({
            where: {
                userId_platform: {
                    userId,
                    platform
                }
            }
        });

        if (existingClaim) {
            return res.status(400).json({ error: "Bonus déjà réclamé pour cette plateforme" });
        }

        // Verification Logic
        if (platform === 'github') {
            try {
                // Verify if user follows the repository owner or the specific user
                // For this example, we'll check if they follow a target user (e.g., the dev 'Mehdi' or project repo)
                // Since I don't know the exact target, I'll simulate a check or check existence
                // Ideally: await axios.get(`https://api.github.com/users/${username}/following/${TARGET_USER}`)

                // For now, let's just verify the user exists on GitHub to prevent fake names
                // const githubRes = await axios.get(`https://api.github.com/users/${username}`);
                // if (githubRes.status !== 200) throw new Error("User not found");

                // Proceed (Option B: Trust or Basic Check)
            } catch (err) {
                // return res.status(400).json({ error: "Utilisateur GitHub introuvable ou erreur API" });
            }
        }

        const bonusPoints = validPlatforms[platform];

        // Add points and record claim
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { points: { increment: bonusPoints } }
            }),
            prisma.pointTransaction.create({
                data: {
                    userId,
                    amount: bonusPoints,
                    type: 'social'
                }
            }),
            prisma.socialClaim.create({
                data: {
                    userId,
                    platform,
                    username,
                    status: 'verified' // Auto-verified for now (Option B)
                }
            })
        ]);

        res.json({
            success: true,
            points: bonusPoints,
            message: `+${bonusPoints} points pour avoir suivi sur ${platform} !`
        });

    } catch (error) {
        console.error("Social bonus error:", error);
        // Handle unique constraint violation if race condition
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Bonus déjà réclamé" });
        }
        res.status(500).json({ error: "Erreur lors de la vérification" });
    }
};

module.exports = {
    spinWheel,
    canSpinToday,
    purchasePoints,
    claimSocialBonus
};
