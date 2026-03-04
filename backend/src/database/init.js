/**
 * @module database/init
 * @description Database initialization and connection management for the SQLite backend.
 *
 * Provides a singleton database connection using an in-memory SQLite database
 * (development mode). The production override in `docker/overrides/database/init.js`
 * switches to a file-based SQLite database for persistence across restarts.
 *
 * Database schema consists of three tables:
 * - `users`        - stores registered user emails
 * - `clients`      - stores client/project records linked to users
 * - `work_entries` - stores time-tracking entries linked to clients and users
 *
 * Foreign keys use CASCADE deletes so removing a user or client automatically
 * removes all associated child records.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/** @type {import('sqlite3').Database | null} Singleton database instance */
let db = null;

/** @type {boolean} Whether a close operation is currently in progress */
let isClosing = false;

/** @type {boolean} Whether the database connection has been fully closed */
let isClosed = false;

/**
 * Returns the singleton SQLite database connection, creating it if it does not
 * yet exist. On creation the closing/closed state flags are reset.
 *
 * In development the database is created in-memory (`:memory:`).
 * The production Docker override replaces this with a file-based path.
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
 * - `users`        - User accounts keyed by email (PK: email)
 * - `clients`      - Client records owned by a user (PK: id, FK: user_email)
 * - `work_entries` - Time entries linked to a client and user (PK: id, FK: client_id, user_email)
 *
 * Indexes are added on foreign-key and frequently-queried columns
 * (`clients.user_email`, `work_entries.client_id`, `work_entries.user_email`,
 * `work_entries.date`) to improve read performance.
 *
 * @returns {Promise<void>} Resolves once all DDL statements have executed.
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
 * The method is idempotent - calling it when the connection is already closed
 * or while a close is in progress will resolve without error. A polling
 * mechanism ensures that concurrent callers wait for the in-flight close to
 * finish rather than attempting a duplicate close.
 *
 * After closing, the singleton reference is set to `null` so that a subsequent
 * call to {@link getDatabase} will open a fresh connection.
 *
 * @returns {Promise<void>} Resolves once the connection is closed.
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
