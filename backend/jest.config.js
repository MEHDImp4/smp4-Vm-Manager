module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  modulePathIgnorePatterns: [
    '<rootDir>/../frontend',
    '<rootDir>/../vpn',
    'AppData/Local/Programs/Microsoft VS Code',
    'AppData/Local/Programs/Antigravity'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/db.js',
    '!src/scripts/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  verbose: true,
};
