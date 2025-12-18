// Mock implementation for db.js
// This ensures prisma object is properly mocked with all necessary methods

const createMockPrismaModel = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  upsert: jest.fn(),
});

const prisma = {
  user: createMockPrismaModel(),
  instance: createMockPrismaModel(),
  domain: createMockPrismaModel(),
  pointTransaction: createMockPrismaModel(),
  snapshot: createMockPrismaModel(),
  template: createMockPrismaModel(),
  templateVersion: createMockPrismaModel(),
  $disconnect: jest.fn(),
  $connect: jest.fn(),
};

module.exports = { prisma };
