const { Pool } = require('pg');
const { getDatabase, initializeDatabase, closeDatabase } = require('../../database/init');

// Mock pg
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: jest.fn().mockResolvedValue(undefined)
  };

  return {
    Pool: jest.fn(() => mockPool)
  };
});

describe('Database Initialization', () => {
  let consoleLogSpy, consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Reset the database singleton
    jest.resetModules();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('getDatabase', () => {
    test('should create and return pool instance', () => {
      const pool = getDatabase();

      expect(pool).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalledWith('Connected to PostgreSQL database');
    });

    test('should return same pool instance on multiple calls', () => {
      const pool1 = getDatabase();
      const pool2 = getDatabase();

      expect(pool1).toBe(pool2);
    });
  });

  describe('initializeDatabase', () => {
    test('should create all required tables', async () => {
      const pool = getDatabase();
      await initializeDatabase();

      expect(pool.query).toHaveBeenCalled();

      // Check that query was called for each table and index
      const queryCalls = pool.query.mock.calls;
      const queries = queryCalls.map(call => call[0]);

      expect(queries.some(q => q.includes('CREATE TABLE IF NOT EXISTS users'))).toBe(true);
      expect(queries.some(q => q.includes('CREATE TABLE IF NOT EXISTS clients'))).toBe(true);
      expect(queries.some(q => q.includes('CREATE TABLE IF NOT EXISTS work_entries'))).toBe(true);
    });

    test('should create indexes for performance', async () => {
      const pool = getDatabase();
      await initializeDatabase();

      const queryCalls = pool.query.mock.calls;
      const queries = queryCalls.map(call => call[0]);

      expect(queries.some(q => q.includes('CREATE INDEX IF NOT EXISTS idx_clients_user_email'))).toBe(true);
      expect(queries.some(q => q.includes('CREATE INDEX IF NOT EXISTS idx_work_entries_client_id'))).toBe(true);
      expect(queries.some(q => q.includes('CREATE INDEX IF NOT EXISTS idx_work_entries_user_email'))).toBe(true);
      expect(queries.some(q => q.includes('CREATE INDEX IF NOT EXISTS idx_work_entries_date'))).toBe(true);
    });

    test('should log success message', async () => {
      await initializeDatabase();

      expect(consoleLogSpy).toHaveBeenCalledWith('Database tables created successfully');
    });

    test('should resolve promise on success', async () => {
      await expect(initializeDatabase()).resolves.toBeUndefined();
    });
  });

  describe('closeDatabase', () => {
    test('should close database connection', async () => {
      const pool = getDatabase();
      await closeDatabase();

      expect(pool.end).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Database connection closed');
    });

    test('should handle close error gracefully', async () => {
      const pool = getDatabase();
      pool.end.mockRejectedValueOnce(new Error('Close error'));

      await closeDatabase();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error closing database:', expect.any(Error));
    });

    test('should handle multiple close calls safely', async () => {
      getDatabase();
      await closeDatabase();
      await closeDatabase(); // Second call should not throw (pool is null)

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Database Schema', () => {
    test('users table should have correct structure', async () => {
      const pool = getDatabase();
      await initializeDatabase();

      const userTableQuery = pool.query.mock.calls.find(call =>
        call[0].includes('CREATE TABLE IF NOT EXISTS users')
      );

      expect(userTableQuery).toBeDefined();
      expect(userTableQuery[0]).toContain('email TEXT PRIMARY KEY');
      expect(userTableQuery[0]).toContain('created_at TIMESTAMP DEFAULT NOW()');
    });

    test('clients table should have foreign key to users', async () => {
      const pool = getDatabase();
      await initializeDatabase();

      const clientTableQuery = pool.query.mock.calls.find(call =>
        call[0].includes('CREATE TABLE IF NOT EXISTS clients')
      );

      expect(clientTableQuery).toBeDefined();
      expect(clientTableQuery[0]).toContain('user_email TEXT NOT NULL');
      expect(clientTableQuery[0]).toContain('FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE');
    });

    test('work_entries table should have foreign keys', async () => {
      const pool = getDatabase();
      await initializeDatabase();

      const workEntriesQuery = pool.query.mock.calls.find(call =>
        call[0].includes('CREATE TABLE IF NOT EXISTS work_entries')
      );

      expect(workEntriesQuery).toBeDefined();
      expect(workEntriesQuery[0]).toContain('FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE');
      expect(workEntriesQuery[0]).toContain('FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE');
    });
  });
});
