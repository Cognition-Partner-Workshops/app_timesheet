const sql = require('mssql');

let pool = null;
let isClosing = false;
let isClosed = false;

// Azure SQL connection configuration
const dbConfig = {
  server: process.env.AZURE_SQL_SERVER || 'localhost',
  database: process.env.AZURE_SQL_DATABASE || 'timesheet',
  user: process.env.AZURE_SQL_USER || 'sa',
  password: process.env.AZURE_SQL_PASSWORD || '',
  port: parseInt(process.env.AZURE_SQL_PORT || '1433'),
  options: {
    encrypt: process.env.AZURE_SQL_ENCRYPT !== 'false', // true by default for Azure
    trustServerCertificate: process.env.AZURE_SQL_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

/**
 * Get or create the connection pool.
 * Returns a wrapper object with get/all/run methods for backward compatibility.
 */
function getDatabase() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  return {
    // Fetch a single row (like sqlite3 db.get)
    get(query, params, callback) {
      const { sqlQuery, inputs } = convertParams(query, params);
      const request = pool.request();
      inputs.forEach(({ name, value }) => request.input(name, value));
      request.query(sqlQuery)
        .then((result) => {
          callback(null, result.recordset[0] || null);
        })
        .catch((err) => {
          callback(err, null);
        });
    },

    // Fetch all rows (like sqlite3 db.all)
    all(query, params, callback) {
      const { sqlQuery, inputs } = convertParams(query, params);
      const request = pool.request();
      inputs.forEach(({ name, value }) => request.input(name, value));
      request.query(sqlQuery)
        .then((result) => {
          callback(null, result.recordset);
        })
        .catch((err) => {
          callback(err, null);
        });
    },

    // Execute a statement (like sqlite3 db.run)
    // Calls callback with `this` context containing lastID and changes
    run(query, params, callback) {
      const { sqlQuery, inputs } = convertParams(query, params);
      const request = pool.request();
      inputs.forEach(({ name, value }) => request.input(name, value));

      // For INSERT statements, append SCOPE_IDENTITY() to get lastID
      let finalQuery = sqlQuery;
      const isInsert = /^\s*INSERT\s+INTO\s+/i.test(sqlQuery);
      if (isInsert) {
        finalQuery = sqlQuery + '; SELECT SCOPE_IDENTITY() AS lastID;';
      }

      request.query(finalQuery)
        .then((result) => {
          const context = {
            lastID: null,
            changes: result.rowsAffected ? result.rowsAffected[0] : 0,
          };
          if (isInsert && result.recordset && result.recordset.length > 0) {
            context.lastID = result.recordset[0].lastID;
          }
          callback.call(context, null);
        })
        .catch((err) => {
          callback.call({}, err);
        });
    },
  };
}

/**
 * Convert positional `?` placeholders to named `@p0, @p1, ...` parameters for mssql.
 */
function convertParams(query, params) {
  if (!params || params.length === 0) {
    return { sqlQuery: query, inputs: [] };
  }

  let idx = 0;
  const inputs = [];
  const sqlQuery = query.replace(/\?/g, () => {
    const name = `p${idx}`;
    inputs.push({ name, value: params[idx] });
    idx++;
    return `@${name}`;
  });

  return { sqlQuery, inputs };
}

async function initializeDatabase() {
  // Create the connection pool
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    console.log('Connected to Azure SQL database');
  } catch (err) {
    console.error('Error connecting to Azure SQL:', err);
    throw err;
  }

  // Create tables if they don't exist
  try {
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      BEGIN
        CREATE TABLE users (
          email NVARCHAR(255) PRIMARY KEY,
          created_at DATETIME2 DEFAULT GETUTCDATE()
        )
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'clients')
      BEGIN
        CREATE TABLE clients (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          description NVARCHAR(MAX),
          department NVARCHAR(255),
          email NVARCHAR(255),
          user_email NVARCHAR(255) NOT NULL,
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE(),
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      END
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'work_entries')
      BEGIN
        CREATE TABLE work_entries (
          id INT IDENTITY(1,1) PRIMARY KEY,
          client_id INT NOT NULL,
          user_email NVARCHAR(255) NOT NULL,
          hours DECIMAL(5,2) NOT NULL,
          description NVARCHAR(MAX),
          date DATE NOT NULL,
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE(),
          FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
          FOREIGN KEY (user_email) REFERENCES users (email)
        )
      END
    `);

    // Create indexes if they don't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_clients_user_email')
        CREATE INDEX idx_clients_user_email ON clients (user_email)
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_work_entries_client_id')
        CREATE INDEX idx_work_entries_client_id ON work_entries (client_id)
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_work_entries_user_email')
        CREATE INDEX idx_work_entries_user_email ON work_entries (user_email)
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_work_entries_date')
        CREATE INDEX idx_work_entries_date ON work_entries (date)
    `);

    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  }
}

function closeDatabase() {
  return new Promise((resolve) => {
    if (isClosed) {
      resolve();
      return;
    }

    if (isClosing) {
      const checkClosed = setInterval(() => {
        if (isClosed) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 10);
      return;
    }

    if (!pool) {
      resolve();
      return;
    }

    isClosing = true;
    pool.close()
      .then(() => {
        isClosed = true;
        isClosing = false;
        pool = null;
        console.log('Database connection closed');
        resolve();
      })
      .catch((err) => {
        isClosed = true;
        isClosing = false;
        pool = null;
        console.error('Error closing database:', err);
        resolve();
      });
  });
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
