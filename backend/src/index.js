require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const log = require('./services/logger.service');
const authRoutes = require('./routes/authRoutes');
const instanceRoutes = require('./routes/instanceRoutes');
const templateRoutes = require('./routes/templateRoutes');

const pointsRoutes = require('./routes/pointsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { startConsumptionCron } = require('./cron/consumptionCron');

const app = express();
const PORT = process.env.PORT || 3000;

// Start background jobs
startConsumptionCron();
const { startSnapshotCron } = require('./cron/snapshotCron');
startSnapshotCron();

const { initDailyReminder } = require('./cron/reminder.cron');
initDailyReminder();



const { initIdleCheckCron } = require('./cron/idleCheck.cron');
initIdleCheckCron();

const redisService = require('./services/redis.service');
redisService.init();

// Seed templates on startup
const { seedTemplates } = require('./scripts/seedTemplates');
seedTemplates();

// Security middleware - helmet adds various HTTP headers for protection
app.use(helmet());

// HTTP Request Logging
const stream = {
    write: (message) => log.http(message.trim())
};

app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream }));

// Global Rate Limiting - Apply to all requests
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    start_on_create: false, // Ensure it doesn't crash if Redis is missing (memory store fallback)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again later.'
    },
    skip: (req) => {
        // Skip rate limiting for health checks or specific internal routes if needed
        return req.path === '/health' || req.path === '/';
    }
});

// Apply global limiter to all routes
app.use(globalLimiter);

// Middleware
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('/data/uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/upgrades', require('./routes/upgradeRoutes'));

app.get('/', (req, res) => {
    res.send('SMP4cloud Web Backend is running');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Global Error Handler
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

const server = app.listen(PORT, () => {
    log.info(`SMP4cloud Backend running on port ${PORT}`);
});

const sshService = require('./services/ssh.service');
sshService.init(server);

