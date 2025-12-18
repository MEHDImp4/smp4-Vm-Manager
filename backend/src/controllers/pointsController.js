const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Daily Spin Wheel
const spinWheel = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user already spun today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingSpin = await prisma.dailySpin.findFirst({
            where: {
                userId,
                spinDate: {
                    gte: today
                }
            }
        });

        if (existingSpin) {
            return res.status(400).json({ 
                error: "Vous avez déjà tourné la roue aujourd'hui !",
                nextSpinIn: getTimeUntilMidnight()
            });
        }

        // Generate random points (10, 25, 50, 75, 100, 150, 200)
        const possiblePrizes = [10, 25, 50, 75, 100, 150, 200];
        const weights = [30, 25, 20, 12, 8, 4, 1]; // Higher chance for lower prizes
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
        await prisma.$transaction([
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingSpin = await prisma.dailySpin.findFirst({
            where: {
                userId,
                spinDate: {
                    gte: today
                }
            }
        });

        res.json({ 
            canSpin: !existingSpin,
            nextSpinIn: existingSpin ? getTimeUntilMidnight() : 0,
            lastSpin: existingSpin ? existingSpin.spinDate : null
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

        const pointsToAdd = amount * 200; // 1$ = 200 points

        // TODO: Integrate Stripe payment here
        // For now, this is a placeholder that simulates the purchase

        res.json({ 
            success: true,
            message: "Intégration de paiement à venir",
            amount,
            points: pointsToAdd,
            paymentUrl: "#" // Replace with Stripe checkout URL
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
        const { platform } = req.body; // "twitter", "github", "linkedin"

        const validPlatforms = {
            twitter: 50,
            github: 50,
            linkedin: 50
        };

        if (!validPlatforms[platform]) {
            return res.status(400).json({ error: "Plateforme invalide" });
        }

        // Check if already claimed
        const existingBonus = await prisma.pointTransaction.findFirst({
            where: {
                userId,
                type: 'social',
                // We'll use a convention: type is "social" and amount equals the platform bonus
                amount: validPlatforms[platform]
            }
        });

        if (existingBonus) {
            return res.status(400).json({ error: "Bonus déjà réclamé pour cette plateforme" });
        }

        const bonusPoints = validPlatforms[platform];

        // Add points
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
            })
        ]);

        res.json({ 
            success: true, 
            points: bonusPoints,
            message: `+${bonusPoints} points pour avoir suivi sur ${platform} !`
        });

    } catch (error) {
        console.error("Social bonus error:", error);
        res.status(500).json({ error: "Erreur" });
    }
};

// Helper function
function getTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime(); // milliseconds until midnight
}

module.exports = {
    spinWheel,
    canSpinToday,
    purchasePoints,
    claimSocialBonus
};
