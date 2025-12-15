const http = require('http');

const postData = JSON.stringify({
    name: 'TestUser',
    email: 'test' + Date.now() + '@example.com',
    password: 'password123'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
        try {
            const data = JSON.parse(chunk);
            if (data.user && data.user.points === 100) {
                console.log('SUCCESS: Points field present and correct (100).');
            } else {
                console.log('FAILURE: Points field missing or incorrect.');
            }
        } catch (e) {
            console.log('Could not parse JSON body');
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
