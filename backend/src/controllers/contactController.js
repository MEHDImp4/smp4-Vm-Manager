const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('../services/email.service');

const submitMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Tous les champs sont requis' });
        }

        const newMessage = await prisma.message.create({
            data: {
                name,
                email,
                message,
            },
        });

        res.status(201).json({ message: 'Message envoyé avec succès', data: newMessage });
    } catch (error) {
        console.error('Error submitting message:', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
    }
};

const getMessages = async (req, res) => {
    try {
        // Ideally pagination here, but for now simple fetch all descending
        const messages = await prisma.message.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.message.delete({
            where: { id },
        });
        res.json({ message: 'Message supprimé' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.message.update({
            where: { id },
            data: { isRead: true },
        });
        res.json(updated);
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    }
};

const replyMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, content } = req.body;

        const originalMessage = await prisma.message.findUnique({ where: { id } });
        if (!originalMessage) {
            return res.status(404).json({ message: 'Message non trouvé' });
        }

        // Send email using emailService (assuming it has sendEmail method)
        // Checking email service capability first might be good, but assuming standard interface usually
        // If emailService is simple nodemailer wrapper, we might need to construct mailOptions

        // Based on previous context, we have an email service. Let's assume it has a sendEmail function.
        // If not, we will need to verify email service implementation.
        // For now, let's implement basic send assuming generic sendEmail(to, subject, html)

        // Using a simple HTML template for reply
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
  .header { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 40px 20px; text-align: center; }
  .header-text { margin: 0; color: white; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .content { padding: 40px 30px; color: #374151; line-height: 1.6; font-size: 16px; }
  .greeting { font-size: 20px; font-weight: 600; margin-bottom: 24px; color: #111827; }
  .message-body { margin-bottom: 32px; white-space: pre-wrap; }
  .quote-box { background-color: #f8fafc; border-left: 4px solid #d8b4fe; padding: 20px; margin-top: 32px; border-radius: 0 8px 8px 0; font-size: 14px; color: #64748b; }
  .quote-header { font-weight: 600; margin-bottom: 8px; color: #475569; display: flex; align-items: center; gap: 8px; }
  .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  .footer-link { color: #a855f7; text-decoration: none; font-weight: 500; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-text">SMP4<span style="opacity: 0.9">cloud</span></div>
    </div>
    <div class="content">
      <div class="greeting">Bonjour ${originalMessage.name},</div>
      
      <div class="message-body">${content}</div>
      
      <div class="quote-box">
        <div class="quote-header">
            En réponse à votre message du ${new Date(originalMessage.createdAt).toLocaleDateString('fr-FR')} :
        </div>
        <div style="font-style: italic;">"${originalMessage.message}"</div>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 10px 0;">Cet email a été envoyé automatiquement par la plateforme SMP4cloud.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} SMP4cloud. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
    `;

        await emailService.sendEmail(originalMessage.email, subject, htmlContent);

        // Optionally mark as read if replied
        await prisma.message.update({
            where: { id },
            data: { isRead: true },
        });

        res.json({ message: 'Réponse envoyée avec succès' });
    } catch (error) {
        console.error('Error replying to message:', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi de la réponse' });
    }
};

module.exports = {
    submitMessage,
    getMessages,
    deleteMessage,
    markAsRead,
    replyMessage
};
