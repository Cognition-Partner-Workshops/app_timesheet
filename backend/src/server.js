/**
 * @module server
 * @description Express application entrypoint.
 *
 * Configures and starts the HTTP server with the following middleware stack
 * (applied in order):
 *
 * 1. **Helmet** -- sets secure HTTP headers.
 * 2. **CORS** -- allows requests from the configured frontend origin.
 * 3. **Rate limiter** -- 100 requests per 15-minute window per IP.
 * 4. **Morgan** -- HTTP request logging (`combined` format).
 * 5. **Body parsers** -- JSON (10 MB limit) and URL-encoded bodies.
 * 6. **Health check** -- `GET /health`.
 * 7. **API routes** -- mounted under `/api`.
 * 8. **Error handler** -- centralized JSON error responses.
 * 9. **404 catch-all** -- returns `{ error: "Route not found" }`.
 *
 * The server initializes the SQLite database before binding to the
 * configured port (default `3001`, overridable via `PORT` env var).
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

/** @type {import('express').Application} */
const app = express();

/** @type {number} Server listen port (defaults to 3001). */
const PORT = process.env.PORT || 3001;

// Security middleware -- sets various HTTP headers for protection
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

/**
 * Rate limiter configuration.
 * Limits each IP address to 100 requests per 15-minute window.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * GET /health
 *
 * Lightweight health-check endpoint used by load balancers and deployment
 * verification scripts. Returns 200 with the current server timestamp.
 *
 * @name HealthCheck
 * @route {GET} /health
 * @returns {object} 200 - `{ status: "OK", timestamp: string }`
 */
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

/**
 * Catch-all 404 handler for unmatched routes.
 *
 * @name NotFound
 * @returns {object} 404 - `{ error: "Route not found" }`
 */
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Initializes the SQLite database and starts the Express server.
 * Exits the process with code 1 if database initialization fails.
 *
 * @async
 * @function startServer
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
