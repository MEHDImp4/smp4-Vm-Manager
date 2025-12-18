#!/usr/bin/env node
/*
  Simple commented-out code detector for CI.
  Scans JS/TS/TSX/JSX files for lines starting with comment markers that look like code.
  Exits with non-zero code if any suspicious lines are found.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INCLUDE_DIRS = ['backend/src', 'frontend/src'];
const EXTENSIONS = new Set(['.js', '.ts', '.tsx', '.jsx']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.turbo']);

// Tokens that indicate code when present at comment start
const CODE_TOKENS = [
  'if', 'for', 'while', 'switch', 'return', 'const', 'let', 'var', 'function',
  'import', 'export', 'class', 'await', 'async', 'try', 'catch', 'throw',
  'interface', 'type', 'enum', 'new'
];

// Comments to ignore (legit annotations)
const ALLOW_PATTERNS = [/eslint/i, /ts-ignore/i, /TODO/i, /FIXME/i];

function shouldIgnoreLine(line) {
  return ALLOW_PATTERNS.some((re) => re.test(line));
}

function isSuspiciousComment(line) {
  const trimmed = line.trim();
  if (shouldIgnoreLine(trimmed)) return false;

  // Single-line comment that looks like code
  if (trimmed.startsWith('//')) {
    const content = trimmed.slice(2).trim();
    const firstToken = content.split(/\s+/)[0] || '';
    return CODE_TOKENS.includes(firstToken);
  }

  // Block comment line that looks like code (simple heuristic)
  if (trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    const content = trimmed.replace(/^\/\*+|^\*+|\*+\/$/g, '').trim();
    const firstToken = content.split(/\s+/)[0] || '';
    return CODE_TOKENS.includes(firstToken);
  }

  return false;
}

function walk(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, idx) => {
    if (isSuspiciousComment(line)) {
      hits.push({ line: idx + 1, text: line.trim() });
    }
  });
  return hits;
}

function main() {
  const files = INCLUDE_DIRS
    .map((p) => path.join(ROOT, p))
    .filter((p) => fs.existsSync(p))
    .flatMap((p) => walk(p));

  let total = 0;
  const report = [];

  for (const file of files) {
    const hits = scanFile(file);
    if (hits.length) {
      total += hits.length;
      for (const h of hits) {
        report.push(`${path.relative(ROOT, file)}:${h.line}: ${h.text}`);
      }
    }
  }

  if (total > 0) {
    console.error('\nCommented-out code detected (fail CI):');
    for (const line of report) console.error(`  - ${line}`);
    console.error(`\nTotal suspicious comments: ${total}`);
    process.exit(1);
  } else {
    console.log('No commented-out code patterns detected.');
  }
}

main();
