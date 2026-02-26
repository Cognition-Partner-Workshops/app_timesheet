/**
 * @module server
 * @description Express application entry point for the Employee Time Tracking
 * backend API.
 *
 * Bootstraps the server by:
 * 1. Configuring security middleware (Helmet, CORS, rate-limiting).
 * 2. Registering JSON body parsing and HTTP request logging (Morgan).
 * 3. Mounting route modules under `/api/*` prefixes.
 * 4. Attaching the centralised error handler and a catch-all 404 handler.
 * 5. Initialising the SQLite in-memory database and starting the HTTP listener.
 *
 * Environment variables:
 * | Variable       | Default                    | Description                          |
 * |----------------|----------------------------|--------------------------------------|
 * | `PORT`         | `3001`                     | TCP port the server listens on.      |
 * | `FRONTEND_URL` | `http://localhost:5173`    | Allowed CORS origin for the SPA.     |
 *
 * @see module:routes/auth
 * @see module:routes/clients
 * @see module:routes/workEntries
 * @see module:routes/reports
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const workEntryRoutes = require('./routes/workEntries');
const reportRoutes = require('./routes/reports');

const { initializeDatabase } = require('./database/init');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------

/** Adds various HTTP security headers (X-Content-Type-Options, etc.). */
app.use(helmet());

/** Restricts cross-origin requests to the configured frontend URL. */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * Global rate limiter — caps each IP address at 100 requests per 15-minute
 * window to mitigate brute-force and DoS attacks.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ---------------------------------------------------------------------------
// Logging & body parsing
// ---------------------------------------------------------------------------

/** Logs every request in Apache "combined" format for observability. */
app.use(morgan('combined'));

/** Parses incoming JSON bodies up to 10 MB. */
app.use(express.json({ limit: '10mb' }));

/** Parses URL-encoded form bodies (extended syntax). */
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * GET /health
 *
 * Lightweight endpoint used by load balancers and monitoring tools to verify
 * the server is responsive. Returns `{ status: 'OK', timestamp }`.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

/** Authentication — login and current-user profile. */
app.use('/api/auth', authRoutes);

/** Client CRUD — create, read, update, delete client records. */
app.use('/api/clients', clientRoutes);

/** Work-entry CRUD — create, read, update, delete time entries. */
app.use('/api/work-entries', workEntryRoutes);

/** Reporting — hourly summaries and CSV/PDF exports. */
app.use('/api/reports', reportRoutes);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/** Centralised error handler — must be registered after all routes. */
app.use(errorHandler);

/** Catch-all handler for undefined routes — returns a 404 JSON response. */
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

/**
 * Initialises the database schema and starts the Express HTTP server.
 *
 * If the database initialisation fails the process exits with code 1 so that
 * the process manager (e.g. systemd, Docker) can restart it.
 *
 * @async
 * @returns {Promise<void>}
 */
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
