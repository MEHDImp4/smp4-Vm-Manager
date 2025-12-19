require('dotenv').config();
const { sendInstanceCredentials } = require('../src/services/email.service');

async function test() {
    console.log('Testing email service...');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not Set');

    // Check if variables are missing
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('ERROR: One or more SMTP environment variables are missing.');
        return;
    }

    const testEmail = process.env.SMTP_USER; // Send to self for testing
    console.log(`Attempting to send test email to ${testEmail}...`);

    try {
        const result = await sendInstanceCredentials(
            testEmail,
            'Test User',
            'Test Instance',
            '192.168.1.100',
            'test-password-123'
        );

        if (result) {
            console.log('Email sent successfully!');
            console.log('Message ID:', result.messageId);
        } else {
            console.log('Email sending failed (service returned undefined). Check previous logs for details.');
        }
    } catch (err) {
        console.error('Unexpected error in test script:', err);
    }
}

test();
