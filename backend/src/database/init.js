/**
 * @module database/init
 * @description SQLite database initialization and lifecycle management.
 *
 * Provides helpers to obtain a singleton database connection, create the
 * required schema (users, clients, work_entries) with performance indexes,
 * and gracefully close the connection when the application shuts down.
 *
 * The database runs **in-memory** (`':memory:'`) so all data is ephemeral
 * and is lost when the process exits.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/** @type {sqlite3.Database|null} Singleton database instance. */
let db = null;

/** @type {boolean} Guard flag to prevent concurrent close operations. */
let isClosing = false;

/** @type {boolean} Indicates whether the database connection has been closed. */
let isClosed = false;

/**
 * Returns the singleton SQLite database instance, creating it on first call.
 *
 * If no connection exists yet, a new in-memory SQLite database is opened and
 * the module-level state flags (`isClosing`, `isClosed`) are reset so the
 * connection can be cleanly re-established after a previous close.
 *
 * @returns {sqlite3.Database} The active database connection.
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
 * Creates all required tables and indexes inside the database.
 *
 * Tables created (if they do not already exist):
 * - **users**        - Stores user emails and registration timestamps.
 * - **clients**      - Stores client entities scoped to a user email, with
 *                      optional description, department, and contact email.
 * - **work_entries** - Stores individual time entries linked to both a client
 *                      and a user, with hours, description, and date.
 *
 * Indexes created for query performance:
 * - `idx_clients_user_email`      - Fast lookup of clients by owner.
 * - `idx_work_entries_client_id`   - Fast lookup of entries by client.
 * - `idx_work_entries_user_email`  - Fast lookup of entries by owner.
 * - `idx_work_entries_date`        - Fast lookup / ordering of entries by date.
 *
 * All DDL statements run inside a serialized block to guarantee ordering.
 *
 * @async
 * @returns {Promise<void>} Resolves when all tables and indexes are ready.
 */
async function initializeDatabase() {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Users table - primary entity for authentication
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          email TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Clients table - each client belongs to exactly one user
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

      // Work entries table - time records linking a user to a client
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

      // Performance indexes
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
 * Handles the following edge-cases:
 * - **Already closed** (`isClosed === true`) - resolves immediately.
 * - **Close in progress** (`isClosing === true`) - polls at 10 ms intervals
 *   until the close completes, then resolves.
 * - **No connection** (`db === null`) - resolves immediately.
 *
 * After a successful close the module-level `db` reference is set to `null`
 * so a subsequent call to {@link getDatabase} will open a fresh connection.
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
