require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

const { initBackupCron } = require('./cron/backup.cron');
initBackupCron();

const { initIdleCheckCron } = require('./cron/idleCheck.cron');
initIdleCheckCron();

// Seed templates on startup
const { seedTemplates } = require('./scripts/seedTemplates');
seedTemplates();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('/data/uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', require('./routes/contactRoutes'));

app.get('/', (req, res) => {
    res.send('SMP4cloud Web Backend is running');
});

const server = app.listen(PORT, () => {
    console.log(`SMP4cloud Backend running on port ${PORT}`);
});

const sshService = require('./services/ssh.service');
sshService.init(server);
