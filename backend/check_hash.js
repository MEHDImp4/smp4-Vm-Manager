const bcrypt = require('bcrypt');

const hash = '$2b$10$HPtTCWYOAfNCtvkVbMcqBema6dmykw86Gs6WSpnvhrwEj0FFXDnfC';
const candidates = ['password123', 'admin', 'secret', '123456', 'password', 'user', 'test'];

async function check() {
    for (const pass of candidates) {
        const match = await bcrypt.compare(pass, hash);
        if (match) {
            console.log(`Match found: ${pass}`);
            return;
        }
    }
    console.log('No match found in common list.');
}

check();
