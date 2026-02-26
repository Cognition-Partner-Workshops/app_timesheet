/**
 * @module database/init
 * @description Database initialization and connection management for the SQLite
 * in-memory database. Provides a singleton database connection, schema creation
 * for the users/clients/work_entries tables, and graceful shutdown support.
 *
 * Tables created:
 *  - **users** — stores registered user emails (primary key: email).
 *  - **clients** — stores client records owned by a user (FK: user_email).
 *  - **work_entries** — stores time entries linked to a client and user
 *    (FKs: client_id, user_email) with CASCADE deletes.
 *
 * Performance indexes are created on foreign-key and date columns.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/** @type {import('sqlite3').Database | null} Singleton database instance. */
let db = null;

/** @type {boolean} Guards against concurrent close attempts. */
let isClosing = false;

/** @type {boolean} Tracks whether the connection has been fully closed. */
let isClosed = false;

/**
 * Returns the singleton SQLite database connection, creating it on first call.
 *
 * The connection uses an in-memory database (`:memory:`), meaning all data is
 * lost when the process exits. For persistent storage, replace the connection
 * string with a file path (e.g. `'./data.db'`).
 *
 * @returns {import('sqlite3').Database} The active database connection.
 * @throws {Error} If the SQLite driver fails to open the database.
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
 * Tables are created inside a serialized transaction to guarantee ordering:
 * 1. `users` — email-based user accounts.
 * 2. `clients` — client records owned by a user.
 * 3. `work_entries` — hourly time entries linked to a client and user.
 *
 * Indexes are added on frequently-queried columns (`user_email`, `client_id`,
 * `date`) to improve read performance.
 *
 * @returns {Promise<void>} Resolves when all DDL statements have executed.
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
 * Handles three edge-cases:
 * - Connection already closed — resolves immediately.
 * - Connection currently closing (concurrent call) — polls until complete.
 * - No connection exists — resolves immediately.
 *
 * After closing, the singleton reference is reset so that {@link getDatabase}
 * will create a fresh connection on the next call.
 *
 * @returns {Promise<void>} Resolves once the connection is fully closed.
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (isClosed) {
      // Already closed, resolve immediately
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
      // No database connection, resolve immediately
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
