const fs = require('fs');
const path = require('path');

// Ensure isolated test database
const devDbPath = path.join(__dirname, 'prisma', 'dev.db');
const testDbPath = path.join(__dirname, 'prisma', 'test.db');
try {
  if (fs.existsSync(devDbPath)) {
    fs.copyFileSync(devDbPath, testDbPath);
  }
} catch (e) {}

process.env.DATABASE_URL = 'file:./test.db';

module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
  ],
};
