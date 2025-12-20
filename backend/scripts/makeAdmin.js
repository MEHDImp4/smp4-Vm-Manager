const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address.');
    console.error('Usage: npm run make-admin <email>');
    process.exit(1);
}

async function main() {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'admin' },
        });
        console.log(`User ${user.email} is now an admin (role: ${user.role}).`);
    } catch (error) {
        if (error.code === 'P2025') {
            console.error(`User with email ${email} not found.`);
        } else {
            console.error('Error updating user:', error);
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
