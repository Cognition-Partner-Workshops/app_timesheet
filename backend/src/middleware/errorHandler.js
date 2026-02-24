/**
 * @module middleware/errorHandler
 * @description Centralized Express error-handling middleware.
 *
 * Provides a single error handler that normalizes errors from different
 * sources (Joi validation, SQLite, and generic errors) into consistent
 * JSON responses.
 */

/**
 * Express error-handling middleware that catches all errors forwarded via
 * `next(err)` and returns a structured JSON response.
 *
 * Error classification:
 * - **Joi validation errors** (`err.isJoi === true`) -> 400 with detail messages.
 * - **SQLite errors** (error code prefixed with `SQLITE_`) -> 500 with a
 *   generic database-error message to avoid leaking internals.
 * - **All other errors** -> Uses `err.status` (or defaults to 500) and
 *   `err.message` (or a generic fallback).
 *
 * @param {Error}  err  - The error object (may be a Joi ValidationError, a
 *                         SQLite error, or any generic Error).
 * @param {import('express').Request}  req  - Express request object (unused).
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Express next function
 *                                                (required by the Express
 *                                                error-handler signature).
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details.map(detail => detail.message)
    });
  }

  // SQLite errors - avoid exposing raw database messages to the client
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while processing your request'
    });
  }

  // Default / generic error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}

module.exports = {
  errorHandler
};
