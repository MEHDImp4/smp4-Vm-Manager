const { verifyToken } = require('../../src/middlewares/authMiddleware');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should extract user from valid token and call next', () => {
    const mockUser = { id: 1, name: 'user' };
    jwt.verify.mockReturnValue(mockUser);

    verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should reject request without authorization header', () => {
    req.headers.authorization = undefined;

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Access denied') }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject request with valid header but invalid token (verification fail)', () => {
    jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid token.' }));
    expect(next).not.toHaveBeenCalled();
  });
});
