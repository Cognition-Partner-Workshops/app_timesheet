/**
 * @module server
 * @description Express application entry point for the Client Timesheet API.
 *
 * Configures middleware (security headers, CORS, rate limiting, logging, body
 * parsing), registers route modules, wires up centralized error handling, and
 * starts the HTTP server after initializing the SQLite database.
 *
 * **Middleware stack** (applied in order):
 * 1. Helmet – sets secure HTTP headers.
 * 2. CORS – allows requests from the configured frontend origin.
 * 3. Rate limiter – 100 requests per 15-minute window per IP.
 * 4. Morgan – HTTP request logging (combined format).
 * 5. Body parsers – JSON (10 MB limit) and URL-encoded.
 *
 * **Route mounts**:
 * | Prefix             | Module            |
 * |--------------------|-------------------|
 * | `/api/auth`        | routes/auth       |
 * | `/api/clients`     | routes/clients    |
 * | `/api/work-entries` | routes/workEntries |
 * | `/api/reports`     | routes/reports    |
 *
 * @requires express
 * @requires cors
 * @requires helmet
 * @requires morgan
 * @requires express-rate-limit
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

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

/**
 * Rate-limiter instance.
 * Restricts each IP to a maximum of 100 requests per 15-minute window.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
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
 * Initializes the SQLite database and starts the Express HTTP server.
 *
 * On success the server listens on the configured `PORT` (default 3001).
 * On failure the process exits with code 1.
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
