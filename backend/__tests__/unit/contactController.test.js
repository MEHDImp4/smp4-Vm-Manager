// Rename variables to start with "mock" to bypass hoisting restriction
const mockPrisma = {
    message: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
    }
};

const mockEmailService = {
    sendEmail: jest.fn(),
};

// Mock the require calls
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../../src/services/email.service', () => mockEmailService);

const {
    submitMessage,
    getMessages,
    deleteMessage,
    markAsRead,
    replyMessage
} = require('../../src/controllers/contactController');

describe('Contact Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe('submitMessage', () => {
        it('should submit a message successfully', async () => {
            req.body = { name: 'John', email: 'john@example.com', message: 'Hello' };
            mockPrisma.message.create.mockResolvedValue({ id: 1, ...req.body });

            await submitMessage(req, res);

            expect(mockPrisma.message.create).toHaveBeenCalledWith({
                data: { name: 'John', email: 'john@example.com', message: 'Hello' }
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Message envoyé avec succès',
                data: expect.any(Object)
            });
        });

        it('should return 400 if fields are missing', async () => {
            req.body = { name: 'John' }; // Missing email and message

            await submitMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tous les champs sont requis' });
        });

        it('should return 500 on db error', async () => {
            req.body = { name: 'John', email: 'john@example.com', message: 'Hello' };
            mockPrisma.message.create.mockRejectedValue(new Error('DB Error'));

            await submitMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Erreur lors de l'envoi du message" });
        });
    });

    describe('getMessages', () => {
        it('should get all messages', async () => {
            req.query = { page: 1, limit: 20 };
            mockPrisma.message.count.mockResolvedValue(2);
            mockPrisma.message.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

            await getMessages(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: [{ id: 1 }, { id: 2 }],
                pagination: expect.objectContaining({ total: 2 })
            }));
        });

        it('should return 500 on db error', async () => {
            req.query = { page: 1, limit: 20 };
            mockPrisma.message.count.mockRejectedValue(new Error('DB Error'));

            await getMessages(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erreur lors de la récupération des messages' });
        });
    });

    describe('deleteMessage', () => {
        it('should delete a message', async () => {
            req.params.id = '123';
            mockPrisma.message.delete.mockResolvedValue({ id: '123' });

            await deleteMessage(req, res);

            expect(mockPrisma.message.delete).toHaveBeenCalledWith({ where: { id: '123' } });
            expect(res.json).toHaveBeenCalledWith({ message: 'Message supprimé' });
        });

        it('should return 500 on db error', async () => {
            req.params.id = '123';
            mockPrisma.message.delete.mockRejectedValue(new Error('DB Error'));

            await deleteMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erreur lors de la suppression' });
        });
    });

    describe('markAsRead', () => {
        it('should mark a message as read', async () => {
            req.params.id = '123';
            mockPrisma.message.update.mockResolvedValue({ id: '123', isRead: true });

            await markAsRead(req, res);

            expect(mockPrisma.message.update).toHaveBeenCalledWith({
                where: { id: '123' },
                data: { isRead: true }
            });
            expect(res.json).toHaveBeenCalledWith({ id: '123', isRead: true });
        });

        it('should return 500 on db error', async () => {
            req.params.id = '123';
            mockPrisma.message.update.mockRejectedValue(new Error('DB Error'));

            await markAsRead(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erreur lors de la mise à jour' });
        });
    });

    describe('replyMessage', () => {
        it('should send a reply successfully', async () => {
            req.params.id = '123';
            req.body = { subject: 'Re: Hello', content: 'This is a reply' };
            const originalMsg = {
                id: '123',
                name: 'User',
                email: 'user@example.com',
                message: 'Original',
                createdAt: new Date()
            };

            mockPrisma.message.findUnique.mockResolvedValue(originalMsg);
            mockEmailService.sendEmail.mockResolvedValue(true);
            mockPrisma.message.update.mockResolvedValue({ ...originalMsg, isRead: true });

            await replyMessage(req, res);

            expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({ where: { id: '123' } });
            expect(mockEmailService.sendEmail).toHaveBeenCalledWith('user@example.com', 'Re: Hello', expect.stringContaining('This is a reply'));
            expect(mockPrisma.message.update).toHaveBeenCalledWith({ where: { id: '123' }, data: { isRead: true } });
            expect(res.json).toHaveBeenCalledWith({ message: 'Réponse envoyée avec succès' });
        });

        it('should return 404 if message not found', async () => {
            req.params.id = '123';
            req.body = { subject: 'Re: Hello', content: 'Reply' };
            mockPrisma.message.findUnique.mockResolvedValue(null);

            await replyMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Message non trouvé' });
        });

        it('should return 500 on error', async () => {
            req.params.id = '123';
            req.body = { subject: 'Re: Hello', content: 'Reply' };
            mockPrisma.message.findUnique.mockRejectedValue(new Error('DB Error'));

            await replyMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Erreur lors de l'envoi de la réponse" });
        });
    });
});
