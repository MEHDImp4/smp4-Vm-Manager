const { z } = require('zod');

// ============================================================================
// Auth Schemas
// ============================================================================

const registerSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be at most 50 characters')
        .trim(),
    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be at most 100 characters'),
});

const loginSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
    password: z.string()
        .min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
    email: z.string().email('Invalid email format'),
    code: z.string().length(6, 'Verification code must be 6 digits'),
});

const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(6, 'New password must be at least 6 characters')
        .max(100, 'Password must be at most 100 characters'),
});

const confirmDeletionSchema = z.object({
    code: z.string().length(6, 'Deletion code must be 6 digits'),
});

// ============================================================================
// Instance Schemas
// ============================================================================

const createInstanceSchema = z.object({
    name: z.string()
        .min(1, 'Instance name is required')
        .max(50, 'Instance name must be at most 50 characters')
        .regex(/^[a-zA-Z0-9-_]+$/, 'Instance name can only contain letters, numbers, hyphens and underscores'),
    templateId: z.string().min(1, 'Template is required'),
    os: z.enum(['ubuntu', 'debian'], {
        errorMap: () => ({ message: 'OS must be ubuntu or debian' })
    }).optional().default('debian'),
});

const createDomainSchema = z.object({
    subdomain: z.string()
        .min(1, 'Subdomain is required')
        .max(30, 'Subdomain must be at most 30 characters')
        .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers and hyphens')
        .toLowerCase(),
    port: z.number()
        .int('Port must be an integer')
        .min(1, 'Port must be at least 1')
        .max(65535, 'Port must be at most 65535')
        .or(z.string().regex(/^\d+$/).transform(Number)),
});

// ============================================================================
// Snapshot Schemas
// ============================================================================

const createSnapshotSchema = z.object({
    name: z.string()
        .min(1, 'Snapshot name is required')
        .max(50, 'Snapshot name must be at most 50 characters'),
    description: z.string().max(200, 'Description must be at most 200 characters').optional(),
});

// ============================================================================
// Contact Schema
// ============================================================================

const contactMessageSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name must be at most 100 characters'),
    email: z.string().email('Invalid email format'),
    message: z.string()
        .min(10, 'Message must be at least 10 characters')
        .max(2000, 'Message must be at most 2000 characters'),
});

// ============================================================================
// Points Schemas
// ============================================================================

const claimSocialBonusSchema = z.object({
    platform: z.enum(['github', 'twitter', 'linkedin', 'discord'], {
        errorMap: () => ({ message: 'Invalid platform' })
    }),
    username: z.string()
        .min(1, 'Username is required')
        .max(50, 'Username must be at most 50 characters'),
});

const purchasePointsSchema = z.object({
    amount: z.number()
        .int('Amount must be an integer')
        .min(100, 'Minimum purchase is 100 points')
        .max(10000, 'Maximum purchase is 10000 points')
        .or(z.string().regex(/^\d+$/).transform(Number)),
});

// ============================================================================
// Pagination Schema
// ============================================================================

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Creates a validation middleware for the request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateBody = (schema) => (req, res, next) => {
    try {
        const result = schema.parse(req.body);
        req.body = result; // Replace with sanitized/transformed data
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const messages = error.errors.map(e => e.message).join(', ');
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        next(error);
    }
};

/**
 * Creates a validation middleware for query parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateQuery = (schema) => (req, res, next) => {
    try {
        const result = schema.parse(req.query);
        req.query = result;
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        next(error);
    }
};

/**
 * Creates a validation middleware for route parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateParams = (schema) => (req, res, next) => {
    try {
        const result = schema.parse(req.params);
        req.params = result;
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        next(error);
    }
};

module.exports = {
    // Schemas
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    updatePasswordSchema,
    confirmDeletionSchema,
    createInstanceSchema,
    createDomainSchema,
    createSnapshotSchema,
    contactMessageSchema,
    claimSocialBonusSchema,
    purchasePointsSchema,
    paginationSchema,
    // Middleware
    validateBody,
    validateQuery,
    validateParams,
};
