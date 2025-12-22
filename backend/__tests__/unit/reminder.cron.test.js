const cron = require('node-cron');
const { prisma } = require('../../src/db');
const emailService = require('../../src/services/email.service');
const { initDailyReminder } = require('../../src/cron/reminder.cron');

// Mock dependencies
jest.mock('node-cron');
jest.mock('../../src/db', () => ({
    prisma: {
        dailySpin: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));
jest.mock('../../src/services/email.service');

describe('Reminder Cron', () => {
    let cronCallback;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock cron.schedule to capture the callback
        cron.schedule.mockImplementation((timing, callback) => {
            cronCallback = callback;
        });
    });

    it('should schedule the cron job at 10:00 AM Europe/Paris', () => {
        initDailyReminder();

        expect(cron.schedule).toHaveBeenCalledWith(
            '0 10 * * *',
            expect.any(Function),
            { timezone: 'Europe/Paris' }
        );
    });

    it('should find active users from yesterday and send reminder if they haven\'t spun today', async () => {
        initDailyReminder();

        // Mock data
        const activeUsersSpins = [{ userId: 1 }, { userId: 2 }];
        const user1 = { id: 1, email: 'user1@example.com', name: 'User One' };

        // Mock DB responses
        prisma.dailySpin.findMany.mockResolvedValue(activeUsersSpins);

        // User 1 hasn't spun today
        prisma.dailySpin.findFirst.mockImplementation(async ({ where }) => {
            if (where.userId === 1) return null;
            if (where.userId === 2) return { id: 100 }; // User 2 spun today
            return null;
        });

        prisma.user.findUnique.mockResolvedValue(user1);

        // Run the cron logic
        await cronCallback();

        // Verify finding users who spun yesterday
        expect(prisma.dailySpin.findMany).toHaveBeenCalledTimes(1);

        // Verify checking if they spun today
        expect(prisma.dailySpin.findFirst).toHaveBeenCalledTimes(2); // Checked for both users

        // Verify email sending
        // Should only send to User 1
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
        expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            'user1@example.com',
            expect.stringContaining('Votre tour quotidien'),
            expect.stringContaining('La Roue tourne')
        );
    });

    it('should not send email if user already spun today', async () => {
        initDailyReminder();

        const activeUsersSpins = [{ userId: 1 }];

        prisma.dailySpin.findMany.mockResolvedValue(activeUsersSpins);
        prisma.dailySpin.findFirst.mockResolvedValue({ id: 99 }); // Spun today

        await cronCallback();

        expect(prisma.user.findUnique).not.toHaveBeenCalled();
        expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        initDailyReminder();

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        prisma.dailySpin.findMany.mockRejectedValue(new Error('DB Error'));

        await cronCallback();

        expect(consoleSpy).toHaveBeenCalledWith(
            '[Cron] Error running daily reminder:',
            expect.any(Error)
        );

        consoleSpy.mockRestore();
    });

    it('should unique-ify user IDs from yesterday', async () => {
        // Test that if a user spun multiple times yesterday (unlikely but possible logic-wise), they are processed once
        initDailyReminder();

        const activeUsersSpins = [{ userId: 1 }, { userId: 1 }];
        prisma.dailySpin.findMany.mockResolvedValue(activeUsersSpins);
        prisma.dailySpin.findFirst.mockResolvedValue(null); // Not spun today
        prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });

        await cronCallback();

        // Should only check once for user 1
        expect(prisma.dailySpin.findFirst).toHaveBeenCalledTimes(1);
        expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    });
});
