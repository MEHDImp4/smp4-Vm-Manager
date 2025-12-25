const https = require('https');
const http = require('http');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const checkUrl = (url) => {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        console.log(`Testing ${url}...`);
        const req = client.get(url, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(res.statusCode);
            } else {
                reject(new Error(`Status ${res.statusCode}`));
            }
        });
        req.on('error', (err) => reject(err));
        req.end();
    });
};

(async () => {
    console.log('🚀 Starting Post-Deployment Smoke Tests...');
    let hasError = false;

    // 1. Check Frontend
    try {
        const status = await checkUrl(FRONTEND_URL);
        console.log(`✅ Frontend is UP (Status: ${status})`);
    } catch (error) {
        console.error(`❌ Frontend Failed: ${error.message}`);
        hasError = true;
    }

    // 2. Check Backend Health
    // We expect a /health endpoint or similar.
    const healthUrl = `${BACKEND_URL}/health`;
    try {
        const status = await checkUrl(healthUrl);
        console.log(`✅ Backend is UP (Status: ${status})`);
    } catch (error) {
        console.error(`❌ Backend Health Check Failed: ${error.message}`);
        hasError = true;
    }

    if (hasError) {
        console.error('💥 Smoke tests failed!');
        process.exit(1);
    } else {
        console.log('🎉 All Smoke Tests Passed!');
        process.exit(0);
    }
})();
