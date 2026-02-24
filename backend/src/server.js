/**
 * @module server
 * @description Main entry point for the Employee Time Tracking API server.
 *
 * Configures and starts an Express application with the following features:
 * - Helmet for HTTP security headers
 * - CORS with configurable allowed origin (defaults to http://localhost:5173)
 * - IP-based rate limiting (100 requests per 15-minute window)
 * - Combined-format HTTP request logging via Morgan
 * - JSON and URL-encoded body parsing (10 MB limit)
 * - Health-check endpoint at GET /health
 * - RESTful API routes for auth, clients, work entries, and reports
 * - Centralized error handling and a catch-all 404 handler
 *
 * Environment variables:
 *   PORT          - Port the server listens on (default: 3001)
 *   FRONTEND_URL  - Allowed CORS origin    (default: http://localhost:5173)
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
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// ---------------------------------------------------------------------------
// Rate limiting - restrict each IP to 100 requests per 15-minute window
// ---------------------------------------------------------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ---------------------------------------------------------------------------
// Logging - Apache combined format
// ---------------------------------------------------------------------------
app.use(morgan('combined'));

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health check - lightweight probe for load balancers / uptime monitors
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/work-entries', workEntryRoutes);
app.use('/api/reports', reportRoutes);

// ---------------------------------------------------------------------------
// Centralized error handling (Joi, SQLite, and generic errors)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Catch-all 404 handler for undefined routes
// ---------------------------------------------------------------------------
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Initializes the SQLite database and starts the HTTP server.
 *
 * On success the server listens on the configured PORT and logs the health
 * check URL.  On failure the process exits with code 1.
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
