const { prisma } = require('../db');
const proxmox = require('./proxmox.service');
const log = require('./logger.service');

const deductPoints = async () => {
    try {
        log.cron("Running point deduction job...");

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
                    },
                    include: {
                        domains: {
                            where: {
                                isPaid: true
                            }
                        }
                    }
                }
            }
        });

        for (const user of usersWithInstances) {
            if (user.role === 'admin') continue;

            let totalDailyCost = 0;
            for (const instance of user.instances) {
                totalDailyCost += instance.pointsPerDay;
                // Add cost for paid domains (2 points/day each)
                const paidDomainsCount = instance.domains?.length || 0;
                totalDailyCost += paidDomainsCount * 2;
            }

            // Calculate cost per minute
            // Cost per day / 24 hours / 60 minutes
            const costPerMinute = totalDailyCost / 24 / 60;

            if (costPerMinute > 0) {
                let newBalance = user.points - costPerMinute;

                if (newBalance <= 0) {
                    log.warn(`User ${user.email} has exhausted points. Stopping instances.`);
                    newBalance = 0;

                    // Get instances to stop with their VMIDs
                    const instancesToStop = await prisma.instance.findMany({
                        where: {
                            userId: user.id,
                            status: 'online'
                        }
                    });

                    // Stop VMs in Proxmox first
                    for (const instance of instancesToStop) {
                        if (instance.vmid) {
                            try {
                                log.info(`Stopping VM ${instance.vmid} for user ${user.email} due to insufficient points`);
                                await proxmox.stopLXC(instance.vmid);
                            } catch (error) {
                                log.error(`Failed to stop VM ${instance.vmid} in Proxmox: ${error.message}`);
                                // Continue anyway to update database
                            }
                        }
                    }

                    // Update database status for all instances
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

                // Update user balance AND log transaction
                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: user.id },
                        data: { points: newBalance }
                    }),
                    prisma.pointTransaction.create({
                        data: {
                            userId: user.id,
                            amount: -costPerMinute,
                            type: 'usage'
                        }
                    })
                ]);

                // log.debug(`Deducted ${costPerMinute.toFixed(4)} points from ${user.email}. New balance: ${newBalance.toFixed(4)}`);
            }
        }
    } catch (error) {
        log.error("Error in point deduction job:", error);
    }
};

module.exports = { deductPoints };
