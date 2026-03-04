const { Pool, types } = require('pg');

// Parse NUMERIC/DECIMAL columns as JavaScript floats instead of strings
types.setTypeParser(1700, (val) => parseFloat(val));

let pool = null;

function getDatabase() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://timesheet:timesheet@localhost:5432/timesheet';
    pool = new Pool({ connectionString });
    console.log('Connected to PostgreSQL database');
  }
  return pool;
}

async function initializeDatabase() {
  const db = getDatabase();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      department TEXT,
      email TEXT,
      user_email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS work_entries (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      hours DECIMAL(5,2) NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
      FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_clients_user_email ON clients (user_email)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_work_entries_client_id ON work_entries (client_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_work_entries_user_email ON work_entries (user_email)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_work_entries_date ON work_entries (date)`);

  console.log('Database tables created successfully');
}

async function closeDatabase() {
  if (!pool) {
    return;
  }

  try {
    await pool.end();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error closing database:', err);
  } finally {
    pool = null;
  }
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
