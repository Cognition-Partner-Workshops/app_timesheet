/**
 * @module database/init
 * @description Database initialization and connection management for SQLite.
 *
 * Provides a singleton database connection using an in-memory SQLite database
 * (development mode). The production override in `docker/overrides/database/init.js`
 * switches to a file-based database for persistence across restarts.
 *
 * Schema consists of three tables with CASCADE foreign keys:
 * - `users`        - keyed by email
 * - `clients`      - linked to a user via `user_email`
 * - `work_entries` - linked to both a client and a user
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Singleton database connection instance.
 * @type {sqlite3.Database | null}
 */
let db = null;

/**
 * Flag indicating whether a close operation is currently in progress.
 * @type {boolean}
 */
let isClosing = false;

/**
 * Flag indicating whether the database connection has been fully closed.
 * @type {boolean}
 */
let isClosed = false;

/**
 * Returns the singleton SQLite database connection, creating it if necessary.
 *
 * On first call the function opens an in-memory SQLite database and resets the
 * closing/closed state flags. Subsequent calls return the same connection.
 *
 * @returns {sqlite3.Database} The active SQLite database connection.
 * @throws {Error} If the database fails to open.
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
 * Creates all required tables and indexes if they do not already exist.
 *
 * Tables created (in order):
 * 1. **users** - `email` (PK), `created_at`
 * 2. **clients** - `id` (PK), `name`, `description`, `department`, `email`,
 *    `user_email` (FK -> users), `created_at`, `updated_at`
 * 3. **work_entries** - `id` (PK), `client_id` (FK -> clients), `user_email`
 *    (FK -> users), `hours`, `description`, `date`, `created_at`, `updated_at`
 *
 * Indexes are added on frequently queried foreign-key and date columns to
 * improve lookup performance.
 *
 * @returns {Promise<void>} Resolves when all tables and indexes have been created.
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
 * Gracefully closes the singleton database connection.
 *
 * The function is idempotent: calling it when the connection is already closed
 * or while a close is in progress will resolve without error. After a
 * successful close the singleton reference is set to `null` so that a
 * subsequent call to {@link getDatabase} will open a fresh connection.
 *
 * @returns {Promise<void>} Resolves once the connection has been closed
 *   (or was already closed).
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
