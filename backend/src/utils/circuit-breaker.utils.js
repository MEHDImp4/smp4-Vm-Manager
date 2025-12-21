/**
 * Circuit Breaker Utilities
 * Implements resilience pattern for external service calls
 */

const CircuitBreaker = require('opossum');
const log = require('../services/logger.service');

// Default circuit breaker options
const DEFAULT_OPTIONS = {
    timeout: 10000,              // 10 second timeout
    errorThresholdPercentage: 50, // Open after 50% failures
    resetTimeout: 30000,          // Try again after 30 seconds
    volumeThreshold: 5,           // Minimum calls before tripping
};

// Service-specific configurations
const SERVICE_CONFIGS = {
    proxmox: {
        timeout: 15000,           // Proxmox can be slow
        errorThresholdPercentage: 60,
        resetTimeout: 60000,      // Wait 1 minute before retry
        volumeThreshold: 3,
    },
    cloudflare: {
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 5,
    },
    vpn: {
        timeout: 20000,           // VPN operations can be slow
        errorThresholdPercentage: 50,
        resetTimeout: 45000,
        volumeThreshold: 3,
    },
    email: {
        timeout: 30000,           // Email can be very slow
        errorThresholdPercentage: 70, // More tolerant for email
        resetTimeout: 60000,
        volumeThreshold: 5,
    },
};

// Store for circuit breaker instances
const breakers = new Map();

/**
 * Create or get a circuit breaker for a function
 * @param {Function} fn - The async function to wrap
 * @param {string} name - Unique name for this breaker
 * @param {string} service - Service type (proxmox, cloudflare, vpn, email)
 * @returns {CircuitBreaker}
 */
const createBreaker = (fn, name, service = 'default') => {
    const key = `${service}:${name}`;

    if (breakers.has(key)) {
        return breakers.get(key);
    }

    const config = SERVICE_CONFIGS[service] || DEFAULT_OPTIONS;
    const breaker = new CircuitBreaker(fn, {
        name: key,
        ...config,
    });

    // Event logging
    breaker.on('open', () => {
        log.warn(`[CircuitBreaker] ${key} opened - service unavailable`);
    });

    breaker.on('halfOpen', () => {
        log.info(`[CircuitBreaker] ${key} half-open - testing service`);
    });

    breaker.on('close', () => {
        log.info(`[CircuitBreaker] ${key} closed - service recovered`);
    });

    breaker.on('timeout', () => {
        log.warn(`[CircuitBreaker] ${key} timeout`);
    });

    breaker.on('reject', () => {
        log.warn(`[CircuitBreaker] ${key} rejected - circuit open`);
    });

    breaker.on('fallback', (result) => {
        log.debug(`[CircuitBreaker] ${key} fallback executed`);
    });

    breakers.set(key, breaker);
    return breaker;
};

/**
 * Wrap an async function with circuit breaker
 * @param {Function} fn - The async function to wrap
 * @param {string} name - Unique name for this breaker
 * @param {string} service - Service type
 * @param {Function} fallback - Optional fallback function
 * @returns {Function} Wrapped function
 */
const wrapWithBreaker = (fn, name, service, fallback = null) => {
    // Bypass circuit breaker in test environment
    if (process.env.NODE_ENV === 'test') {
        return fn;
    }

    const breaker = createBreaker(fn, name, service);

    if (fallback) {
        breaker.fallback(fallback);
    }

    return async (...args) => {
        return breaker.fire(...args);
    };
};

/**
 * Get circuit breaker stats for monitoring
 * @returns {Object} Stats for all breakers
 */
const getStats = () => {
    const stats = {};
    for (const [key, breaker] of breakers) {
        stats[key] = {
            state: breaker.opened ? 'open' : (breaker.halfOpen ? 'halfOpen' : 'closed'),
            stats: breaker.stats,
        };
    }
    return stats;
};

/**
 * Reset all circuit breakers (useful for testing)
 */
const resetAll = () => {
    for (const breaker of breakers.values()) {
        breaker.close();
    }
};

module.exports = {
    createBreaker,
    wrapWithBreaker,
    getStats,
    resetAll,
    SERVICE_CONFIGS,
    DEFAULT_OPTIONS,
};
