const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const templates = await prisma.template.findMany();
        console.log("Templates found:", templates.length);
        console.log(JSON.stringify(templates, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
