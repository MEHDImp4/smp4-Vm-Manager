const pkg = require('p-queue');
console.log('Raw export:', pkg);
console.log('Type:', typeof pkg);
if (typeof pkg === 'function') {
    try {
        new pkg({ concurrency: 1 });
        console.log('Constructable: Yes');
    } catch (e) {
        console.log('Constructable: No, error:', e.message);
    }
}
if (pkg.default) {
    console.log('Has default export');
    try {
        new pkg.default({ concurrency: 1 });
        console.log('Default Constructable: Yes');
    } catch (e) {
        console.log('Default Constructable: No, error:', e.message);
    }
}
