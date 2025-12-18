const { initializeDatabase } = require('./src/db');

(async () => {
    try {
        const db = await initializeDatabase();
        const users = await db.all('SELECT id, name, email, password FROM users');
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.info('Registered users:', users);
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching users:', error);
    }
})();
