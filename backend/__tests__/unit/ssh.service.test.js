const sshService = require('../../src/services/ssh.service');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Mock external dependencies
jest.mock('ws', () => {
    return {
        Server: jest.fn().mockImplementation(() => ({
            on: jest.fn()
        }))
    };
});

jest.mock('jsonwebtoken');

describe('SSH Service Security', () => {
    let mockServer;
    let verifyClientCallback;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
        mockServer = {};
    });

    // Helper to extract the verifyClient function from the WebSocket.Server constructor call
    const getVerifyClient = () => {
        sshService.init(mockServer);
        const calls = WebSocket.Server.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const options = calls[calls.length - 1][0]; // Get options from last call
        return options.verifyClient;
    };

    test('should reject connection without token', () => {
        const verifyClient = getVerifyClient();
        const info = { req: { url: '/ws/ssh?vmid=100&host=1.2.3.4' } };
        const cb = jest.fn();

        verifyClient(info, cb);

        expect(cb).toHaveBeenCalledWith(false, 401, expect.stringContaining('No token provided'));
    });

    test('should reject connection with invalid token', () => {
        jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

        const verifyClient = getVerifyClient();
        const info = { req: { url: '/ws/ssh?vmid=100&host=1.2.3.4&token=invalid' } };
        const cb = jest.fn();

        verifyClient(info, cb);

        expect(jwt.verify).toHaveBeenCalledWith('invalid', 'test-secret');
        expect(cb).toHaveBeenCalledWith(false, 403, expect.stringContaining('Invalid token'));
    });

    test('should accept connection with valid token', () => {
        jwt.verify.mockReturnValue({ id: 1 });

        const verifyClient = getVerifyClient();
        const info = { req: { url: '/ws/ssh?vmid=100&host=1.2.3.4&token=valid-token' } };
        const cb = jest.fn();

        verifyClient(info, cb);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
        expect(cb).toHaveBeenCalledWith(true);
    });
});
