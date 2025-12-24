const pointsController = require('../../src/controllers/pointsController');
const { prisma } = require('../../src/db');

// Mock dependencies
jest.mock('../../src/db', () => ({
    prisma: {
        dailySpin: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        user: {
            update: jest.fn(),
            findUnique: jest.fn(),
        },
        pointTransaction: {
            create: jest.fn(),
            findFirst: jest.fn(),
        },
        socialClaim: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock('../../src/services/email.service', () => ({
    sendEmail: jest.fn().mockResolvedValue({}),
}));

describe('Points Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            user: { id: 'user1' },
            body: {},
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    });

    describe('spinWheel', () => {
        it('should allow user to spin if they have not spun today', async () => {
            // Mock verified user
            prisma.user.findUnique.mockResolvedValue({ isVerified: true, email: 'test@example.com' });

            // Mock no spin today
            prisma.dailySpin.findFirst.mockResolvedValue(null);

            // Mock transaction success
            prisma.$transaction.mockResolvedValue([
                { id: 'user1', points: 100 }, // update user
                { id: 'spin1' }, // create spin
                { id: 'trans1' } // create transaction
            ]);

            await pointsController.spinWheel(req, res);

            expect(prisma.dailySpin.findFirst).toHaveBeenCalled();
            expect(prisma.$transaction).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                points: expect.any(Number)
            }));
        });

        it('should return 400 if user already spun today', async () => {
            // Mock verified user
            prisma.user.findUnique.mockResolvedValue({ isVerified: true });

            // Mock spin exists
            prisma.dailySpin.findFirst.mockResolvedValue({
                spinDate: new Date()
            });

            await pointsController.spinWheel(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('Vous devez attendre 24h entre chaque tour !')
            }));
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            prisma.user.findUnique.mockResolvedValue({ isVerified: true });
            prisma.dailySpin.findFirst.mockRejectedValue(new Error('DB Error'));

            await pointsController.spinWheel(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Erreur lors du tirage' });
        });
    });

    describe('canSpinToday', () => {
        it('should return true if no spin today', async () => {
            prisma.dailySpin.findFirst.mockResolvedValue(null);

            await pointsController.canSpinToday(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                canSpin: true,
                nextSpinIn: 0,
                lastSpin: null
            }));
        });

        it('should return false if already spun', async () => {
            const spinDate = new Date();
            prisma.dailySpin.findFirst.mockResolvedValue({ spinDate });

            await pointsController.canSpinToday(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                canSpin: false,
                lastSpin: spinDate
            }));
            // nextSpinIn should be > 0
            const response = res.json.mock.calls[0][0];
            expect(response.nextSpinIn).toBeGreaterThan(0);
        });

        it('should handle errors', async () => {
            prisma.dailySpin.findFirst.mockRejectedValue(new Error('DB Error'));

            await pointsController.canSpinToday(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Erreur' });
        });
    });

    describe('purchasePoints', () => {
        it('should return placeholder response for valid amount', async () => {
            prisma.user.findUnique.mockResolvedValue({ isVerified: true });
            req.body.amount = 5; // Valid: 1, 2, 5, 10

            await pointsController.purchasePoints(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                amount: 5,
                points: expect.any(Number)
            }));
        });

        it('should return 400 for invalid amount', async () => {
            prisma.user.findUnique.mockResolvedValue({ isVerified: true });
            req.body.amount = 3; // Invalid

            await pointsController.purchasePoints(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Montant invalide' });
        });

        it('should handle errors', async () => {
            // To trigger error, we can make req.body undefined or similar, 
            // but since we just access req.body.amount, let's throw manually or mock something if it did DB calls.
            // But purchasePoints doesn't do DB calls yet.
            // We can pass req as null to throw TypeError but that might be too extreme.
            // Let's rely on the try/catch block.
            // If I pass req without body it might throw if destructuring fails? No, { amount } = undefined throws.

            req = {}; // no body

            await pointsController.purchasePoints(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('claimSocialBonus', () => {
        it('should claim bonus if platform is valid and not yet claimed', async () => {
            prisma.user.findUnique.mockResolvedValue({ isVerified: true });
            req.body.platform = 'github';
            req.body.username = 'testuser';

            // Mock not claimed
            prisma.socialClaim.findUnique.mockResolvedValue(null);

            // Mock transaction success
            prisma.$transaction.mockResolvedValue([]);

            await pointsController.claimSocialBonus(req, res);

            expect(prisma.socialClaim.findUnique).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    userId_platform: {
                        userId: 'user1',
                        platform: 'github'
                    }
                }
            }));

            expect(prisma.$transaction).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                points: 50
            }));
        });

        it('should return 400 if platform is invalid', async () => {
            prisma.user.findUnique.mockResolvedValue({ isVerified: true });
            req.body.platform = 'myspace';

            await pointsController.claimSocialBonus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Plateforme invalide' });
            expect(prisma.pointTransaction.findFirst).not.toHaveBeenCalled();
        });

        it('should return 400 if bonus already claimed', async () => {
            prisma.user.findUnique.mockResolvedValue({ isVerified: true });
            req.body.platform = 'twitter';
            req.body.username = 'testuser';

            prisma.socialClaim.findUnique.mockResolvedValue({ id: 'claim1' });

            await pointsController.claimSocialBonus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Bonus déjà réclamé pour cette plateforme' });
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            prisma.user.findUnique.mockResolvedValue({ isVerified: true });
            req.body.platform = 'linkedin';
            req.body.username = 'testuser';
            prisma.socialClaim.findUnique.mockRejectedValue(new Error('DB Error'));

            await pointsController.claimSocialBonus(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
