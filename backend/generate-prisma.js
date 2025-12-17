const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('Current directory:', __dirname);
console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
    execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
    console.log('Generation successful');
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
    console.log('Sync successful');
} catch (error) {
    console.error('Command failed');
    process.exit(1);
}
