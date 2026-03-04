/**
 * @module server
 * @description Express application entry point for the Client Timesheet API.
 *
 * Configures and starts the HTTP server with the following middleware stack
 * (applied in order):
 *
 * 1. **Helmet** - sets security-related HTTP headers.
 * 2. **CORS** - allows cross-origin requests from the frontend origin.
 * 3. **Rate limiter** - caps each IP to 100 requests per 15-minute window.
 * 4. **Morgan** - logs every request in the `combined` Apache format.
 * 5. **Body parsers** - parses JSON (up to 10 MB) and URL-encoded bodies.
 *
 * Route groups:
 * - `/api/auth`         - Authentication (login, profile).
 * - `/api/clients`      - Client CRUD.
 * - `/api/work-entries`  - Work-entry CRUD.
 * - `/api/reports`       - Report generation and export.
 *
 * A `/health` endpoint returns `{ status: 'OK', timestamp }` for liveness
 * checks. Unmatched routes receive a 404 JSON response.
 *
 * The server initialises the SQLite database before binding to the
 * configured port (default `3001`).
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

/** @type {number} Port the server listens on (from `PORT` env var or default 3001) */
const PORT = process.env.PORT || 3001;

// Security middleware - sets various HTTP headers to harden the application
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting - prevents abuse by capping requests per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  max: 100                   // max requests per window per IP
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/work-entries', workEntryRoutes);
app.use('/api/reports', reportRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Initialises the SQLite database schema and starts the Express HTTP server.
 *
 * If database initialisation fails the process exits with code 1 to allow
 * container orchestrators (Docker, ECS) to detect the failure and restart.
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
