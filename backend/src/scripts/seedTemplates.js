const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const templates = require('../config/templates.json');
const log = require('../services/logger.service');

async function seedTemplates() {
    log.info('Seeding templates from JSON config...');

    try {
        for (const template of templates) {
            // Extract versions to handle separately
            const { versions, ...templateData } = template;

            // Upsert Template
            // Look for existing template to decide on points update logic?
            // Actually, we can just exclude 'points' from the update payload.
            // If the template exists, we keep its points (which might be custom admin set).
            // If it doesn't exist, we use the JSON value.

            const { points, ...updateData } = templateData;

            await prisma.template.upsert({
                where: { id: template.id },
                update: updateData, // Do NOT update points on existing records
                create: templateData, // Do create with points on new records
            });

            // Upsert Template Versions
            if (versions && versions.length > 0) {
                for (const v of versions) {
                    await prisma.templateVersion.upsert({
                        where: {
                            templateId_os: {
                                templateId: template.id,
                                os: v.os
                            }
                        },
                        update: { proxmoxId: v.proxmoxId },
                        create: {
                            templateId: template.id,
                            os: v.os,
                            proxmoxId: v.proxmoxId
                        }
                    });
                }
            }
        }
        log.info('Templates and versions seeded successfully.');
    } catch (error) {
        log.error('Error seeding templates:', error);
    }
}

// Allow standalone execution
if (require.main === module) {
    seedTemplates()
        .then(async () => {
            await prisma.$disconnect();
        })
        .catch(async (e) => {
            log.error(e);
            await prisma.$disconnect();
            process.exit(1);
        });
}

module.exports = { seedTemplates };
