const fs = require('fs');
const path = require('path');
const { validateImageSignature } = require('../../src/utils/fileValidation');

const TEST_DIR = path.join(__dirname, 'temp_uploads');

describe('File Security - Magic Number Validation', () => {

    beforeAll(() => {
        if (!fs.existsSync(TEST_DIR)) {
            fs.mkdirSync(TEST_DIR);
        }
    });

    afterAll(() => {
        // Cleanup
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    const createFile = (name, buffer) => {
        const filePath = path.join(TEST_DIR, name);
        fs.writeFileSync(filePath, buffer);
        return filePath;
    };

    test('should validate valid PNG', async () => {
        // PNG Signature: 89 50 4E 47
        const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        const filePath = createFile('valid.png', buffer);

        const isValid = await validateImageSignature(filePath);
        expect(isValid).toBe(true);
    });

    test('should validate valid JPEG', async () => {
        // JPEG Signature: FF D8 FF
        const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
        const filePath = createFile('valid.jpg', buffer);

        const isValid = await validateImageSignature(filePath);
        expect(isValid).toBe(true);
    });

    test('should validate valid GIF', async () => {
        // GIF Signature: 47 49 46 38
        const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
        const filePath = createFile('valid.gif', buffer);

        const isValid = await validateImageSignature(filePath);
        expect(isValid).toBe(true);
    });

    test('should reject text file masquerading as PNG', async () => {
        const buffer = Buffer.from('This is a text file');
        const filePath = createFile('fake.png', buffer);

        const isValid = await validateImageSignature(filePath);
        expect(isValid).toBe(false);
    });

    test('should reject empty file', async () => {
        const filePath = createFile('empty.png', Buffer.alloc(0));

        const isValid = await validateImageSignature(filePath);
        expect(isValid).toBe(false);
    });

    test('should reject file with random bytes', async () => {
        const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
        const filePath = createFile('random.jpg', buffer);

        const isValid = await validateImageSignature(filePath);
        expect(isValid).toBe(false);
    });
});
