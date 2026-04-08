/**
 * @module server
 * @description Express application entry point.
 *
 * Sets up the middleware pipeline in the following order:
 *  1. **Security** — Helmet (HTTP security headers) and CORS.
 *  2. **Rate limiting** — 100 requests per IP per 15-minute window.
 *  3. **Logging** — Morgan in `combined` format.
 *  4. **Body parsing** — JSON (up to 10 MB) and URL-encoded bodies.
 *  5. **Health check** — `GET /health`.
 *  6. **Application routes** — auth, clients, work-entries, reports.
 *  7. **Error handling** — centralised JSON error handler.
 *  8. **404 catch-all** — any unmatched route returns `{ error: "Route not found" }`.
 *
 * The server initialises the SQLite in-memory database before binding to the
 * port defined by the `PORT` environment variable (default 3001).
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

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// ── Rate limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ── Logging ─────────────────────────────────────────────────────────────────
app.use(morgan('combined'));

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ────────────────────────────────────────────────────────────

/**
 * GET /health
 *
 * Returns `{ status: "OK", timestamp: "<ISO-8601>" }`. Useful for load-balancer
 * liveness probes — this endpoint does **not** require authentication.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Application routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/work-entries', workEntryRoutes);
app.use('/api/reports', reportRoutes);

// ── Error handling ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── 404 catch-all ───────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Initialises the database schema and starts the HTTP server.
 *
 * If database initialisation fails the process exits with code 1 so that
 * process managers (PM2, systemd, Docker) can detect the failure and restart.
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
