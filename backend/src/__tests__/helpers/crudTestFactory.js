const request = require('supertest');
const express = require('express');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    req.userEmail = 'test@example.com';
    next();
  }
}));

function createTestApp(basePath, routes) {
  const app = express();
  app.use(express.json());
  app.use(basePath, routes);
  app.use((err, req, res, next) => {
    if (err.isJoi) return res.status(400).json({ error: 'Validation error' });
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

function createMockDb() {
  const mockDb = { all: jest.fn(), get: jest.fn(), run: jest.fn() };
  getDatabase.mockReturnValue(mockDb);
  return mockDb;
}

function mockDbRun(mockDb, lastID = 1) {
  mockDb.run.mockImplementation(function(query, params, callback) {
    this.lastID = lastID;
    callback.call(this, null);
  });
}

function mockDbRunError(mockDb) {
  mockDb.run.mockImplementation(function(query, params, callback) {
    callback.call(this, new Error('Database error'));
  });
}

function mockDbGetResult(mockDb, result) {
  mockDb.get.mockImplementation((query, params, callback) => callback(null, result));
}

function mockDbGetError(mockDb) {
  mockDb.get.mockImplementation((query, params, callback) => callback(new Error('Database error'), null));
}

function mockDbGetSequence(mockDb, results) {
  results.forEach((result, i) => {
    if (result instanceof Error) {
      mockDb.get.mockImplementationOnce((q, p, cb) => cb(result, null));
    } else {
      mockDb.get.mockImplementationOnce((q, p, cb) => cb(null, result));
    }
  });
}

module.exports = {
  createTestApp, createMockDb, mockDbRun, mockDbRunError,
  mockDbGetResult, mockDbGetError, mockDbGetSequence
};
