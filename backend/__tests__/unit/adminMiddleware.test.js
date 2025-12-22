const adminMiddleware = require('../../src/middlewares/adminMiddleware');

describe('Admin Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: {
                role: 'user'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    it('should call next if user is admin', async () => {
        req.user.role = 'admin';
        await adminMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user is not admin', async () => {
        req.user.role = 'user';
        await adminMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. Admin privileges required.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user is missing', async () => {
        req.user = undefined;
        await adminMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        // Force an error by making req circular or something (though function itself is simple)
        // Or mock something if it had external dependencies.
        // Given the simple nature, `req.user` access is the main logic.
        // We can simulate an error by making `req.user` a getter that throws.

        Object.defineProperty(req, 'user', {
            get: () => { throw new Error('Test Error'); }
        });

        await adminMiddleware(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Server error during admin verification.' });
    });
});
