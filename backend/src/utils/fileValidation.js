const fs = require('fs').promises;

/**
 * Validates the magic numbers (file signature) of an image file.
 * Supports JPEG, PNG, GIF, and WEBP.
 * 
 * @param {string} filePath - Path to the file to validate
 * @returns {Promise<boolean>} - True if valid image signature, false otherwise
 */
const validateImageSignature = async (filePath) => {
    let fileHandle;
    try {
        fileHandle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(12);
        const { bytesRead } = await fileHandle.read(buffer, 0, 12, 0);

        if (bytesRead < 4) {
            return false;
        }

        // JPEG: FF D8 FF
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return true;
        }

        // PNG: 89 50 4E 47
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return true;
        }

        // GIF: 47 49 46 38
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
            return true;
        }

        // WEBP: RIFF .... WEBP
        // RIFF at 0, WEBP at 8
        if (bytesRead >= 12 &&
            buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return true;
        }

        return false;
    } catch (error) {
        // If file doesn't exist or other error, return false
        console.error(`[FileValidation] Error validating signature for ${filePath}:`, error.message);
        return false;
    } finally {
        if (fileHandle) {
            await fileHandle.close();
        }
    }
};

module.exports = { validateImageSignature };
