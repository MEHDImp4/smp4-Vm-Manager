const { z } = require('zod');
const { validateBody, validateQuery, validateParams } = require('../../src/middlewares/validation');

describe('Validation Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            query: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    const testSchema = z.object({
        field: z.string().min(1)
    });

    describe('validateBody', () => {
        it('should call next if validation succeeds', () => {
            req.body = { field: 'value' };
            validateBody(testSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 400 if validation fails with standard Zod error', () => {
            req.body = { field: '' }; // Invalid
            validateBody(testSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Validation error',
                errors: expect.any(Array)
            }));
        });

        it('should handle ZodError with undefined errors array (Defensive Check)', () => {
            const schema = z.object({});
            // Mock schema.parse to throw a malformed ZodError
            jest.spyOn(schema, 'parse').mockImplementation(() => {
                const error = new z.ZodError([]);
                error.errors = undefined; // Force undefined
                throw error;
            });

            validateBody(schema)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Validation error',
                errors: []
            });
        });

        it('should handle ZodError with errors missing path or message', () => {
            const schema = z.object({});
            jest.spyOn(schema, 'parse').mockImplementation(() => {
                const error = new z.ZodError([]);
                // @ts-ignore
                error.errors = [{}]; // Empty error object
                throw error;
            });

            validateBody(schema)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Validation error',
                errors: [{ field: 'unknown', message: 'Unknown error' }]
            });
        });

        it('should pass non-Zod errors to next', () => {
            const schema = z.object({});
            const genericError = new Error('Generic error');
            jest.spyOn(schema, 'parse').mockImplementation(() => {
                throw genericError;
            });

            validateBody(schema)(req, res, next);

            expect(next).toHaveBeenCalledWith(genericError);
        });
    });

    describe('validateQuery', () => {
        it('should validate query parameters', () => {
            req.query = { field: 'value' };
            validateQuery(testSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should return 400 on query validation failure', () => {
            req.query = { field: '' };
            validateQuery(testSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle malformed ZodError in query validation', () => {
            const schema = z.object({});
            jest.spyOn(schema, 'parse').mockImplementation(() => {
                const error = new z.ZodError([]);
                error.errors = undefined;
                throw error;
            });

            validateQuery(schema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: [] }));
        });
    });

    describe('validateParams', () => {
        it('should validate route parameters', () => {
            req.params = { field: 'value' };
            validateParams(testSchema)(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should return 400 on params validation failure', () => {
            req.params = { field: '' };
            validateParams(testSchema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle malformed ZodError in params validation', () => {
            const schema = z.object({});
            jest.spyOn(schema, 'parse').mockImplementation(() => {
                const error = new z.ZodError([]);
                error.errors = undefined;
                throw error;
            });

            validateParams(schema)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: [] }));
        });
    });
});
