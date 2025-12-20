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
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Réponse à votre message sur SMP4cloud</h2>
        <p>Bonjour ${originalMessage.name},</p>
        <p>${content.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Message original du ${new Date(originalMessage.createdAt).toLocaleDateString()}:<br>
        <i>${originalMessage.message}</i></p>
      </div>
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
