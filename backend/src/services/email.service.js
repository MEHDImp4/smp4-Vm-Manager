const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send VM credentials to the user
 * @param {string} to - User's email address
 * @param {string} userName - User's name
 * @param {string} instanceName - Name of the instance
 * @param {string} ip - IP address of the instance
 * @param {string} password - The generated password
 */
const sendInstanceCredentials = async (to, userName, instanceName, ip, password) => {
    try {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            console.warn('[Email] SMTP not configured, skipping email.');
            return;
        }

        const mailOptions = {
            from: process.env.SMTP_FROM || '"SMP4 VM Manager" <noreply@smp4.xyz>',
            to: to,
            subject: `Your Instance "${instanceName}" is Ready!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Hello ${userName},</h2>
                    <p>Your Virtual Machine <strong>${instanceName}</strong> has been successfully provisioned and is ready to use.</p>
                    
                    <h3>Access Details:</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>IP Address:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${ip}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Username:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">smp4</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Password:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; background-color: #f5f5f5;">${password}</td>
                        </tr>
                    </table>

                    <p><strong>Note:</strong> This password is also the root password. Assuming you are connected via our VPN or have set up port forwarding.</p>

                    <p>You can manage your instance and download your VPN configuration from the dashboard.</p>
                    
                    <p>Happy coding,<br/>The SMP4 Team</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Credentials sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('[Email] Failed to send email:', error);
        // Do not throw, just log. We don't want to break the VM creation flow just because of email.
    }
};

module.exports = {
    sendInstanceCredentials,
};
