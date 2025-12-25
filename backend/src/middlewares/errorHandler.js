const log = require('../services/logger.service');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log the error
    // We use 'exception' helper if available or error with object
    log.error(`[${req.method} ${req.path}] Uncaught Error: ${message}`, {
        stack: err.stack,
        body: req.body,
        query: req.query,
        params: req.params,
        userId: req.user?.id
    });

    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'Internal Server Error'
            : message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler;
