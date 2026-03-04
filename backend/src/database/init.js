/**
 * @module database/init
 * @description SQLite database initialization and connection management.
 *
 * Provides a singleton database connection (in-memory for development) and
 * handles schema creation for the three core tables: `users`, `clients`, and
 * `work_entries`. Foreign-key CASCADE deletes ensure referential integrity.
 *
 * **Tables created on initialization:**
 * | Table          | Primary Key | Foreign Keys                                                  |
 * |----------------|-------------|---------------------------------------------------------------|
 * | `users`        | `email`     | --                                                            |
 * | `clients`      | `id`        | `user_email` -> `users(email)`                                |
 * | `work_entries`  | `id`        | `client_id` -> `clients(id)`, `user_email` -> `users(email)` |
 *
 * Performance indexes are created on `clients.user_email`,
 * `work_entries.client_id`, `work_entries.user_email`, and `work_entries.date`.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/** @type {import('sqlite3').Database | null} */
let db = null;

/** @type {boolean} Whether the database is in the process of closing. */
let isClosing = false;

/** @type {boolean} Whether the database connection has been fully closed. */
let isClosed = false;

/**
 * Returns the singleton SQLite database instance, creating a new in-memory
 * connection if one does not already exist. Resets closing/closed state when
 * a fresh connection is established.
 *
 * @returns {import('sqlite3').Database} The active SQLite database connection.
 * @throws {Error} If the database connection cannot be opened.
 *
 * @example
 * const db = getDatabase();
 * db.all('SELECT * FROM users', [], (err, rows) => { ... });
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
 * Initializes the database schema by creating all required tables and indexes
 * inside a serialized transaction. Safe to call multiple times thanks to
 * `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` guards.
 *
 * **Created tables:**
 * - `users` -- stores registered user emails.
 * - `clients` -- stores client/project records scoped to a user.
 * - `work_entries` -- stores individual time-tracking entries linked to a
 *   client and user.
 *
 * **Created indexes:**
 * - `idx_clients_user_email`
 * - `idx_work_entries_client_id`
 * - `idx_work_entries_user_email`
 * - `idx_work_entries_date`
 *
 * @returns {Promise<void>} Resolves when all tables and indexes have been created.
 * @throws {Error} If any DDL statement fails.
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
 * - If the connection is already closed, resolves immediately.
 * - If a close is already in progress, waits for it to complete before resolving.
 * - Otherwise closes the connection, resets the singleton reference, and resolves.
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
