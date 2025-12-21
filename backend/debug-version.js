const pkg = require('p-queue');
try {
    const version = require('p-queue/package.json').version;
    console.log('Version:', version);
} catch (e) {
    console.log('Could not read version from package.json');
}
console.log('Raw export keys:', Object.keys(pkg));
