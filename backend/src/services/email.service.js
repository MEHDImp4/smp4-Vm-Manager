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
            from: process.env.SMTP_FROM || '"SMP4cloud VM Manager" <noreply@smp4.xyz>',
            to: to,
            subject: `Votre Instance "${instanceName}" est Prête !`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">🚀 Votre VM est prête !</h2>
                    </div>
                    
                    <div style="padding: 30px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #333;">Bonjour <strong>${userName}</strong>,</p>
                        <p style="font-size: 16px; color: #555; line-height: 1.5;">
                            Votre machine virtuelle <strong>${instanceName}</strong> a été provisionnée avec succès et est prête à l'emploi.
                        </p>
                        
                        <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1f2937; font-size: 18px;">🔑 Informations d'accès</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280; width: 120px;"><strong>Adresse IP :</strong></td>
                                    <td style="padding: 8px 0; color: #111827; font-family: monospace; font-size: 14px;">${ip}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280;"><strong>Utilisateur :</strong></td>
                                    <td style="padding: 8px 0; color: #111827; font-family: monospace; font-size: 14px;">smp4</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280;"><strong>Mot de passe :</strong></td>
                                    <td style="padding: 8px 0;">
                                        <span style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; color: #000;">${password}</span>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <div style="background-color: #fee2e2; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                            <p style="margin: 0; color: #991b1b; font-size: 14px;">
                                <strong>⚠️ Important :</strong> Ce mot de passe est temporaire. Vous serez invité à le changer dès votre première connexion.
                            </p>
                        </div>

                        <h3 style="color: #1f2937; font-size: 18px; margin-top: 25px;">🌐 Comment se connecter ?</h3>
                        <p style="font-size: 15px; color: #555; line-height: 1.5;">
                            Pour accéder à votre VM, vous devez être connecté au réseau local via notre VPN (WireGuard).
                        </p>
                        <ol style="color: #555; padding-left: 20px; line-height: 1.5;">
                            <li style="margin-bottom: 8px;">Téléchargez votre configuration VPN depuis le tableau de bord.</li>
                            <li style="margin-bottom: 8px;">Installez le client <a href="https://www.wireguard.com/install/" style="color: #2563eb; text-decoration: none;">WireGuard</a>.</li>
                            <li style="margin-bottom: 8px;">Importez le fichier de configuration et activez la connexion.</li>
                        </ol>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
                            <p>Happy coding,<br/>L'équipe SMP4cloud</p>
                        </div>
                    </div>
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

/**
 * Send a generic email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
const sendEmail = async (to, subject, html) => {
    try {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            console.warn('[Email] SMTP not configured, skipping email.');
            return;
        }

        const mailOptions = {
            from: process.env.SMTP_FROM || '"SMP4cloud" <noreply@smp4.xyz>',
            to: to,
            subject: subject,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Sent "${subject}" to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('[Email] Failed to send email:', error);
    }
};

module.exports = {
    sendInstanceCredentials,
    sendEmail,
    sendAccountBannedEmail: async (to, name, reason, expiresAt) => {
        const subject = "⚠️ Votre compte a été suspendu";
        const html = `
             <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Compte Suspendu</h2>
                <p>Bonjour ${name},</p>
                <p>Votre compte a été suspendu par un administrateur.</p>
                <p><strong>Raison :</strong> ${reason || 'Non spécifiée'}</p>
                <p><strong>Expiration :</strong> ${expiresAt ? new Date(expiresAt).toLocaleString() : 'Permanente'}</p>
                <p>Si vous pensez qu'il s'agit d'une erreur, contactez le support.</p>
            </div>
        `;
        return module.exports.sendEmail(to, subject, html);
    },
    sendAccountDeletedEmail: async (to, name, reason) => {
        const subject = "❌ Votre compte a été supprimé";
        const html = `
             <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Compte Supprimé</h2>
                <p>Bonjour ${name},</p>
                <p>Votre compte a été définitivement supprimé de notre plateforme.</p>
                 <p><strong>Raison :</strong> ${reason || 'Non spécifiée'}</p>
                 <p>Toutes vos instances et données associées ont été effacées.</p>
            </div>
        `;
        return module.exports.sendEmail(to, subject, html);
    },
    sendVerificationCode: async (to, name, code) => {
        const subject = "🎉 Bienvenue sur SMP4cloud - Vérifiez votre compte";
        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 12px;">
                <div style="background: white; padding: 40px; border-radius: 10px;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                            <span style="font-size: 30px;">☁️</span>
                        </div>
                        <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">Bienvenue sur SMP4cloud !</h1>
                    </div>

                    <!-- Welcome Message -->
                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
                        <p style="color: #374151; font-size: 16px; margin: 0 0 10px 0;">
                            Bonjour <strong>${name}</strong> 👋
                        </p>
                        <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.6;">
                            Merci d'avoir rejoint SMP4cloud, votre plateforme de gestion de machines virtuelles dans le cloud. 
                            Nous sommes ravis de vous compter parmi nous !
                        </p>
                    </div>

                    <!-- Verification Code -->
                    <div style="text-align: center; margin: 30px 0;">
                        <p style="color: #374151; font-size: 15px; margin-bottom: 15px;">
                            Pour activer votre compte et recevoir votre <strong style="color: #667eea;">bonus de 100 points</strong>, 
                            veuillez entrer ce code de vérification :
                        </p>
                        <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 25px; border-radius: 10px; margin: 20px 0; border: 2px dashed #667eea;">
                            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                                ${code}
                            </div>
                        </div>
                        <p style="color: #9ca3af; font-size: 13px; margin-top: 10px;">
                            ⏱️ Ce code est valide jusqu'à la vérification de votre compte
                        </p>
                    </div>

                    <!-- What's Next -->
                    <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 30px 0;">
                        <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 16px;">🚀 Prochaines étapes :</h3>
                        <ul style="color: #047857; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li><strong>Vérifiez votre email</strong> avec le code ci-dessus</li>
                            <li><strong>Recevez 100 points</strong> pour créer votre première VM</li>
                            <li><strong>Explorez</strong> nos templates et créez vos instances</li>
                            <li><strong>Gagnez des points</strong> quotidiennement avec la roue de fortune</li>
                        </ul>
                    </div>

                    <!-- Features -->
                    <div style="margin: 30px 0;">
                        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; text-align: center;">✨ Ce qui vous attend</h3>
                        <div style="display: grid; gap: 10px;">
                            <div style="background: #f9fafb; padding: 12px 15px; border-radius: 6px; border-left: 3px solid #667eea;">
                                <strong style="color: #374151; font-size: 14px;">💻 Machines Virtuelles</strong>
                                <p style="color: #6b7280; font-size: 13px; margin: 5px 0 0 0;">Déployez des VMs en quelques clics</p>
                            </div>
                            <div style="background: #f9fafb; padding: 12px 15px; border-radius: 6px; border-left: 3px solid #8b5cf6;">
                                <strong style="color: #374151; font-size: 14px;">🎯 Snapshots & Backups</strong>
                                <p style="color: #6b7280; font-size: 13px; margin: 5px 0 0 0;">Protégez vos données facilement</p>
                            </div>
                            <div style="background: #f9fafb; padding: 12px 15px; border-radius: 6px; border-left: 3px solid #ec4899;">
                                <strong style="color: #374151; font-size: 14px;">🎁 Système de Points</strong>
                                <p style="color: #6b7280; font-size: 13px; margin: 5px 0 0 0;">Gagnez des points et économisez</p>
                            </div>
                        </div>
                    </div>

                    <!-- Security Notice -->
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
                        <p style="color: #92400e; font-size: 13px; margin: 0;">
                            <strong>🔒 Note de sécurité :</strong> Si vous n'avez pas créé de compte sur SMP4cloud, 
                            ignorez cet email. Votre adresse n'a pas été compromise.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e5e7eb; text-align: center;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                            Besoin d'aide ? Nous sommes là pour vous !
                        </p>
                        <a href="https://smp4.xyz" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
                            Accéder au Dashboard
                        </a>
                        <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                            L'équipe SMP4cloud<br/>
                            <span style="color: #d1d5db;">© 2024 SMP4cloud - Tous droits réservés</span>
                        </p>
                    </div>
                </div>
            </div>
        `;
        return module.exports.sendEmail(to, subject, html);
    }
};
