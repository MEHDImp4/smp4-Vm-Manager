const request = require('supertest');
const express = require('express');
const contactRoutes = require('../../src/routes/contactRoutes');
const contactController = require('../../src/controllers/contactController');

// Mock dependencies
jest.mock('../../src/controllers/contactController');
jest.mock('../../src/middlewares/authMiddleware', () => ({
    verifyToken: (req, res, next) => next()
}));
jest.mock('../../src/middlewares/validation', () => ({
    validateBody: () => (req, res, next) => next(),
    contactMessageSchema: {}
}));

const app = express();
app.use(express.json());
app.use('/api/contact', contactRoutes);

describe('Contact Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock implementations
        contactController.submitMessage.mockImplementation((req, res) => res.status(200).json({ success: true }));
        contactController.getMessages.mockImplementation((req, res) => res.status(200).json({ messages: [] }));
        contactController.deleteMessage.mockImplementation((req, res) => res.status(200).json({ success: true }));
        contactController.markAsRead.mockImplementation((req, res) => res.status(200).json({ success: true }));
        contactController.replyMessage.mockImplementation((req, res) => res.status(200).json({ success: true }));
    });

    describe('POST /api/contact', () => {
        it('should call submitMessage', async () => {
            await request(app).post('/api/contact').send({});
            expect(contactController.submitMessage).toHaveBeenCalled();
        });
    });

    describe('GET /api/contact', () => {
        it('should call getMessages', async () => {
            await request(app).get('/api/contact');
            expect(contactController.getMessages).toHaveBeenCalled();
        });
    });

    describe('DELETE /api/contact/:id', () => {
        it('should call deleteMessage', async () => {
            await request(app).delete('/api/contact/1');
            expect(contactController.deleteMessage).toHaveBeenCalled();
        });
    });

    describe('PUT /api/contact/:id/read', () => {
        it('should call markAsRead', async () => {
            await request(app).put('/api/contact/1/read');
            expect(contactController.markAsRead).toHaveBeenCalled();
        });
    });

    describe('POST /api/contact/:id/reply', () => {
        it('should call replyMessage', async () => {
            await request(app).post('/api/contact/1/reply').send({});
            expect(contactController.replyMessage).toHaveBeenCalled();
        });
    });
});
