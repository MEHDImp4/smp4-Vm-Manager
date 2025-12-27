const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next'
];

const EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx'];

const KEYWORDS = [
    'import',
    'export',
    'const',
    'let',
    'var',
    'function',
    'class',
    'return',
    'if',
    'for',
    'while',
    'switch',
    'module.exports'
];

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            if (EXTENSIONS.includes(path.extname(file))) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(process.cwd());
let hasError = false;

console.log('Scanning for commented out code...');

files.forEach(file => {
    // Skip this script itself
    if (file === __filename) return;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) {
            const commentContent = trimmed.substring(2).trim();
            // Check if it starts with a keyword (heuristic)
            const firstWord = commentContent.split(' ')[0];
            const secondWord = commentContent.split(' ')[1];

            // Heuristic: // const x = ...
            if (KEYWORDS.includes(firstWord)) {
                console.error(`Possible commented code in ${path.relative(process.cwd(), file)}:${index + 1}`);
                console.error(`  ${trimmed}`);
                hasError = true;
            }
        }
    });
});

if (hasError) {
    console.error('Found commented out code. Please remove it.');
    process.exit(1);
} else {
    console.log('No commented out code found.');
    process.exit(0);
}
