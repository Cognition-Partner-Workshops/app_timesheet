const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;
let isClosing = false;
let isClosed = false;

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

      // Add mobile column to users table (for OTP login)
      database.run(`
        ALTER TABLE users ADD COLUMN mobile TEXT
      `, [], function(err) {
        if (err) {
          // Ignore "duplicate column name" error - column already exists
          if (!err.message.includes('duplicate column')) {
            console.error('Error adding mobile column:', err);
          }
        }
      });

      // Create otp_codes table for mobile OTP authentication
      database.run(`
        CREATE TABLE IF NOT EXISTS otp_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mobile TEXT NOT NULL,
          otp_code TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      database.run(`CREATE INDEX IF NOT EXISTS idx_otp_codes_mobile ON otp_codes (mobile)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_users_mobile ON users (mobile)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes (expires_at)`);

      // Clean up expired OTP codes
      database.run(`DELETE FROM otp_codes WHERE expires_at < datetime('now')`);
      // Clean up used OTP codes older than 1 hour
      database.run(`DELETE FROM otp_codes WHERE used = 1 AND created_at < datetime('now', '-1 hour')`);
      // Clean up all OTP codes older than 24 hours
      database.run(`DELETE FROM otp_codes WHERE created_at < datetime('now', '-24 hours')`);
      // Clean up OTP codes with null or empty mobile
      database.run(`DELETE FROM otp_codes WHERE mobile IS NULL OR mobile = ''`);

      console.log('Database tables created successfully');
      resolve();
    });
  });
}

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
