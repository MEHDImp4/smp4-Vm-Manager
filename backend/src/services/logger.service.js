const winston = require('winston');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info';
};

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
);

// JSON format for file/production output
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
    level: level(),
    levels,
    transports: [
        // Console transport (always enabled)
        new winston.transports.Console({
            format: consoleFormat,
        }),
    ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({
        filename: '/data/logs/error.log',
        level: 'error',
        format: jsonFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));

    logger.add(new winston.transports.File({
        filename: '/data/logs/combined.log',
        format: jsonFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}

// Helper methods for common logging patterns
const log = {
    // Basic logging
    error: (message, meta = {}) => logger.error(message, meta),
    warn: (message, meta = {}) => logger.warn(message, meta),
    info: (message, meta = {}) => logger.info(message, meta),
    http: (message, meta = {}) => logger.http(message, meta),
    debug: (message, meta = {}) => logger.debug(message, meta),

    // Contextual logging helpers
    request: (req, message) => {
        logger.http(message, {
            method: req.method,
            path: req.path,
            userId: req.user?.id,
        });
    },

    // Error with stack trace
    exception: (error, context = {}) => {
        logger.error(error.message, {
            stack: error.stack,
            ...context,
        });
    },

    // Service-specific logging
    proxmox: (message, meta = {}) => logger.info(`[Proxmox] ${message}`, meta),
    cloudflare: (message, meta = {}) => logger.info(`[Cloudflare] ${message}`, meta),

    ssh: (message, meta = {}) => logger.info(`[SSH] ${message}`, meta),
    cron: (message, meta = {}) => logger.info(`[Cron] ${message}`, meta),
    email: (message, meta = {}) => logger.info(`[Email] ${message}`, meta),
    auth: (message, meta = {}) => logger.info(`[Auth] ${message}`, meta),
    instance: (message, meta = {}) => logger.info(`[Instance] ${message}`, meta),
};

module.exports = log;
module.exports.logger = logger;
