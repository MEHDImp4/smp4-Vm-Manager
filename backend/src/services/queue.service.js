const { default: PQueue } = require('p-queue');

// Global queue instance with concurrency 1
const vmCreationQueue = new PQueue({ concurrency: 1 });
const vmAllocationQueue = new PQueue({ concurrency: 1 });

module.exports = {
    vmCreationQueue,
    vmAllocationQueue
};
