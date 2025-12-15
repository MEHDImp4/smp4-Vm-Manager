const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const templates = require('../config/templates.json');

async function seedTemplates() {
    console.log('Seeding templates from JSON config...');

    try {
        for (const template of templates) {
            // Extract versions to handle separately
            const { versions, ...templateData } = template;

            // Upsert Template
            await prisma.template.upsert({
                where: { id: template.id },
                update: templateData,
                create: templateData,
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
        console.log('Templates and versions seeded successfully.');
    } catch (error) {
        console.error('Error seeding templates:', error);
    }
}

// Allow standalone execution
if (require.main === module) {
    seedTemplates()
        .then(async () => {
            await prisma.$disconnect();
        })
        .catch(async (e) => {
            console.error(e);
            await prisma.$disconnect();
            process.exit(1);
        });
}

module.exports = { seedTemplates };
