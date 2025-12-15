const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const deductPoints = async () => {
    try {
        console.log("Running point deduction job...");

        // 1. Get all users with online instances
        // We fetch users and include their online instances to calculate total cost
        const usersWithInstances = await prisma.user.findMany({
            where: {
                instances: {
                    some: {
                        status: 'online'
                    }
                }
            },
            include: {
                instances: {
                    where: {
                        status: 'online'
                    }
                }
            }
        });

        for (const user of usersWithInstances) {
            let totalDailyCost = 0;
            for (const instance of user.instances) {
                totalDailyCost += instance.pointsPerDay;
            }

            // Calculate cost per minute
            // Cost per day / 24 hours / 60 minutes
            const costPerMinute = totalDailyCost / 24 / 60;

            if (costPerMinute > 0) {
                let newBalance = user.points - costPerMinute;

                // CRITICAL: Check if balance is exhausted
                if (newBalance <= 0) {
                    console.log(`User ${user.email} has exhausted points. Stopping instances.`);
                    newBalance = 0;

                    // Stop all instances for this user
                    await prisma.instance.updateMany({
                        where: {
                            userId: user.id,
                            status: 'online'
                        },
                        data: {
                            status: 'stopped'
                        }
                    });
                }

                // Update user balance
                await prisma.user.update({
                    where: { id: user.id },
                    data: { points: newBalance }
                });

                // console.log(`Deducted ${costPerMinute.toFixed(4)} points from ${user.email}. New balance: ${newBalance.toFixed(4)}`);
            }
        }
    } catch (error) {
        console.error("Error in point deduction job:", error);
    }
};

module.exports = { deductPoints };
