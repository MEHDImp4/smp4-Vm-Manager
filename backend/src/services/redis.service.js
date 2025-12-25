const { createClient } = require('redis');
const log = require('./logger.service');

let client;
let isConnected = false;

const init = async () => {
    if (client) return;

    const url = process.env.REDIS_URL || 'redis://redis:6379';

    // Only initialize if configured, or default to internal service
    client = createClient({ url });

    client.on('error', (err) => {
        // Prevent crashing if Redis is down
        log.error('[Redis] Client Error:', err.message);
    });

    client.on('connect', () => {
        log.info('[Redis] Connected');
        isConnected = true;
    });

    client.on('reconnecting', () => {
        log.info('[Redis] Reconnecting...');
    });

    try {
        await client.connect();
    } catch (error) {
        log.error('[Redis] Failed to connect:', error.message);
    }
};

const get = async (key) => {
    if (!isConnected) return null;
    try {
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        log.error(`[Redis] Get error for key ${key}:`, error.message);
        return null;
    }
};

const set = async (key, value, ttlSeconds = 300) => {
    if (!isConnected) return;
    try {
        await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
        log.error(`[Redis] Set error for key ${key}:`, error.message);
    }
};

const del = async (key) => {
    if (!isConnected) return;
    try {
        await client.del(key);
    } catch (error) {
        log.error(`[Redis] Del error for key ${key}:`, error.message);
    }
}

const quit = async () => {
    if (client) {
        await client.quit();
        isConnected = false;
    }
}

module.exports = { init, get, set, del, quit };
