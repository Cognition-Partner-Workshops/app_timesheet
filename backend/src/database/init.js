/**
 * @module database/init
 * @description SQLite database initialization and lifecycle management.
 *
 * Manages a singleton SQLite in-memory database connection. The module handles
 * creating the schema (users, clients, work_entries tables and indexes),
 * retrieving the shared connection, and tearing it down gracefully.
 *
 * **Important:** Because the database is in-memory, all data is lost when the
 * process exits. For persistent storage, change the connection string from
 * `:memory:` to a file path (e.g. `./data/timesheet.db`).
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/** @type {import('sqlite3').Database | null} Singleton database instance */
let db = null;

/** @type {boolean} Guard flag — true while a close operation is in progress */
let isClosing = false;

/** @type {boolean} Guard flag — true after the connection has been closed */
let isClosed = false;

/**
 * Returns the singleton SQLite database instance, creating it on first call.
 *
 * The connection is lazily initialized. Subsequent calls return the same
 * instance until {@link closeDatabase} is invoked.
 *
 * @returns {import('sqlite3').Database} The active database connection.
 * @throws {Error} If the underlying SQLite driver fails to open the database.
 */
function getDatabase() {
  if (!db) {
    // Reset state when creating a new database connection
    isClosing = false;
    isClosed = false;
    // Use in-memory database as specified in requirements
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite in-memory database');
    });
  }
  return db;
}

/**
 * Creates all application tables and indexes if they do not already exist.
 *
 * Tables created:
 *  - **users** — registered user accounts (keyed by email).
 *  - **clients** — client entities owned by a user.
 *  - **work_entries** — logged hours linked to a client and user.
 *
 * Indexes created on `clients.user_email`, `work_entries.client_id`,
 * `work_entries.user_email`, and `work_entries.date` to speed up common
 * query patterns.
 *
 * @async
 * @returns {Promise<void>} Resolves once the schema has been created.
 */
async function initializeDatabase() {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Create users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          email TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create clients table
      database.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          department TEXT,
          email TEXT,
          user_email TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `);

      // Create work_entries table
      database.run(`
        CREATE TABLE IF NOT EXISTS work_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          hours DECIMAL(5,2) NOT NULL,
          description TEXT,
          date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      database.run(`CREATE INDEX IF NOT EXISTS idx_clients_user_email ON clients (user_email)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_work_entries_client_id ON work_entries (client_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_work_entries_user_email ON work_entries (user_email)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_work_entries_date ON work_entries (date)`);

      console.log('Database tables created successfully');
      resolve();
    });
  });
}

/**
 * Gracefully closes the database connection.
 *
 * Safe to call multiple times — subsequent calls while a close is already in
 * progress will wait for it to finish, and calls after the connection is
 * already closed resolve immediately. After closing, the next call to
 * {@link getDatabase} will open a fresh connection.
 *
 * @returns {Promise<void>} Resolves once the connection is fully closed.
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (isClosed) {
      resolve();
      return;
    }
    
    if (isClosing) {
      // Currently closing, wait for it to complete
      const checkClosed = setInterval(() => {
        if (isClosed) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 10);
      return;
    }
    
    if (!db) {
      resolve();
      return;
    }
    
    isClosing = true;
    db.close((err) => {
      isClosed = true;
      isClosing = false;
      db = null;
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
