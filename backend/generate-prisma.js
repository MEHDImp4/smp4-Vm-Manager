const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const logInfo = (...args) => {
    if (process.env.NODE_ENV !== 'production') {
        console.info(...args);
    }
};

logInfo('Current directory:', __dirname);
logInfo('Using DATABASE_URL from environment');

try {
    execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
    logInfo('Generation successful');
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
    logInfo('Sync successful');
} catch (error) {
    console.error('Command failed');
    process.exit(1);
}
