const fs = require('fs');

/**
 * Validates the magic numbers (file signature) of an image file.
 * Supports JPEG, PNG, GIF, and WEBP.
 * 
 * @param {string} filePath - Path to the file to validate
 * @returns {Promise<boolean>} - True if valid image signature, false otherwise
 */
const validateImageSignature = async (filePath) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: 11 });

    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => {
            if (chunk.length < 4) {
                return resolve(false);
            }

            // JPEG: FF D8 FF
            if (chunk[0] === 0xFF && chunk[1] === 0xD8 && chunk[2] === 0xFF) {
                return resolve(true);
            }

            // PNG: 89 50 4E 47
            if (chunk[0] === 0x89 && chunk[1] === 0x50 && chunk[2] === 0x4E && chunk[3] === 0x47) {
                return resolve(true);
            }

            // GIF: 47 49 46 38
            if (chunk[0] === 0x47 && chunk[1] === 0x49 && chunk[2] === 0x46 && chunk[3] === 0x38) {
                return resolve(true);
            }

            // WEBP: RIFF .... WEBP
            // RIFF at 0, WEBP at 8
            if (chunk.length >= 12 &&
                chunk[0] === 0x52 && chunk[1] === 0x49 && chunk[2] === 0x46 && chunk[3] === 0x46 &&
                chunk[8] === 0x57 && chunk[9] === 0x45 && chunk[10] === 0x42 && chunk[11] === 0x50) {
                return resolve(true);
            }

            resolve(false);
        });

        stream.on('end', () => {
            resolve(false);
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
};

module.exports = { validateImageSignature };
