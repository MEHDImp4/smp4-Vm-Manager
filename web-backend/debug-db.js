const { initializeDatabase } = require('./src/db');

(async () => {
    try {
        const db = await initializeDatabase();
        const users = await db.all('SELECT id, name, email, password FROM users');
        console.log('Registered Users:', users);
    } catch (error) {
        console.error('Error fetching users:', error);
    }
})();
