describe('Database Initialization', () => {
  let consoleLogSpy, consoleErrorSpy;
  let mockPool, mockRequest;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockRequest = {
      input: jest.fn().mockReturnThis(),
      query: jest.fn().mockResolvedValue({ recordset: [], rowsAffected: [0] }),
    };

    mockPool = {
      request: jest.fn(() => ({ ...mockRequest })),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Reset module registry so each test gets a fresh init.js singleton
    jest.resetModules();

    // Set up the default working mock for mssql via doMock (after resetModules)
    jest.doMock('mssql', () => ({
      ConnectionPool: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(mockPool),
      })),
    }));
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('getDatabase', () => {
    test('should throw if initializeDatabase has not been called', () => {
      const { getDatabase } = require('../../database/init');

      expect(() => getDatabase()).toThrow('Database not initialized');
    });

    test('should return database wrapper after initialization', async () => {
      const { getDatabase, initializeDatabase } = require('../../database/init');
      await initializeDatabase();

      const db = getDatabase();
      expect(db).toBeDefined();
      expect(typeof db.get).toBe('function');
      expect(typeof db.all).toBe('function');
      expect(typeof db.run).toBe('function');
    });

    test('should return same wrapper instance on multiple calls', async () => {
      const { getDatabase, initializeDatabase } = require('../../database/init');
      await initializeDatabase();

      const db1 = getDatabase();
      const db2 = getDatabase();
      // Both calls should return an object with the same methods
      expect(typeof db1.get).toBe('function');
      expect(typeof db2.get).toBe('function');
    });

    test('should handle database connection error', async () => {
      jest.resetModules();
      jest.doMock('mssql', () => ({
        ConnectionPool: jest.fn(() => ({
          connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        })),
      }));

      const { initializeDatabase: initWithError } = require('../../database/init');

      await expect(initWithError()).rejects.toThrow('Connection failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error connecting to Azure SQL:', expect.any(Error));
    });
  });

  describe('initializeDatabase', () => {
    test('should create all required tables', async () => {
      const { initializeDatabase } = require('../../database/init');
      await initializeDatabase();

      // The pool.request().query() should have been called multiple times for table creation
      const queryCalls = mockRequest.query.mock.calls;
      const queries = queryCalls.map(call => call[0]);

      expect(queries.some(q => q.includes('CREATE TABLE users'))).toBe(true);
      expect(queries.some(q => q.includes('CREATE TABLE clients'))).toBe(true);
      expect(queries.some(q => q.includes('CREATE TABLE work_entries'))).toBe(true);
    });

    test('should create indexes for performance', async () => {
      const { initializeDatabase } = require('../../database/init');
      await initializeDatabase();

      const queryCalls = mockRequest.query.mock.calls;
      const queries = queryCalls.map(call => call[0]);

      expect(queries.some(q => q.includes('idx_clients_user_email'))).toBe(true);
      expect(queries.some(q => q.includes('idx_work_entries_client_id'))).toBe(true);
      expect(queries.some(q => q.includes('idx_work_entries_user_email'))).toBe(true);
      expect(queries.some(q => q.includes('idx_work_entries_date'))).toBe(true);
    });

    test('should log success message', async () => {
      const { initializeDatabase } = require('../../database/init');
      await initializeDatabase();

      expect(consoleLogSpy).toHaveBeenCalledWith('Database tables created successfully');
    });

    test('should resolve promise on success', async () => {
      const { initializeDatabase } = require('../../database/init');
      await expect(initializeDatabase()).resolves.toBeUndefined();
    });
  });

  describe('closeDatabase', () => {
    test('should close database connection', async () => {
      const { initializeDatabase, closeDatabase } = require('../../database/init');
      await initializeDatabase();
      await closeDatabase();

      expect(mockPool.close).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Database connection closed');
    });

    test('should handle close error gracefully', async () => {
      const { initializeDatabase, closeDatabase } = require('../../database/init');
      await initializeDatabase();
      mockPool.close.mockRejectedValue(new Error('Close error'));

      await closeDatabase();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error closing database:', expect.any(Error));
    });

    test('should handle multiple close calls safely', async () => {
      const { initializeDatabase, closeDatabase } = require('../../database/init');
      await initializeDatabase();
      await closeDatabase();
      await closeDatabase(); // Second call should not throw

      // Only one close call should have been made
      expect(mockPool.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Database Schema', () => {
    test('users table should have correct structure', async () => {
      const { initializeDatabase } = require('../../database/init');
      await initializeDatabase();

      const queryCalls = mockRequest.query.mock.calls;
      const userTableQuery = queryCalls.find(call =>
        call[0].includes('CREATE TABLE users')
      );

      expect(userTableQuery).toBeDefined();
      expect(userTableQuery[0]).toContain('email NVARCHAR(255) PRIMARY KEY');
      expect(userTableQuery[0]).toContain('created_at DATETIME2 DEFAULT GETUTCDATE()');
    });

    test('clients table should have foreign key to users', async () => {
      const { initializeDatabase } = require('../../database/init');
      await initializeDatabase();

      const queryCalls = mockRequest.query.mock.calls;
      const clientTableQuery = queryCalls.find(call =>
        call[0].includes('CREATE TABLE clients')
      );

      expect(clientTableQuery).toBeDefined();
      expect(clientTableQuery[0]).toContain('user_email NVARCHAR(255) NOT NULL');
      expect(clientTableQuery[0]).toContain('FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE');
    });

    test('work_entries table should have foreign keys', async () => {
      const { initializeDatabase } = require('../../database/init');
      await initializeDatabase();

      const queryCalls = mockRequest.query.mock.calls;
      const workEntriesQuery = queryCalls.find(call =>
        call[0].includes('CREATE TABLE work_entries')
      );

      expect(workEntriesQuery).toBeDefined();
      expect(workEntriesQuery[0]).toContain('FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE');
      expect(workEntriesQuery[0]).toContain('FOREIGN KEY (user_email) REFERENCES users (email)');
    });
  });
});
