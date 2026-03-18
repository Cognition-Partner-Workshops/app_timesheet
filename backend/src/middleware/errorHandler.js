/**
 * @module middleware/errorHandler
 * @description Centralised Express error-handling middleware.
 *
 * Catches errors forwarded via `next(err)` from route handlers and returns
 * a consistent JSON error response. The handler distinguishes between:
 *
 *  - **Joi validation errors** (`err.isJoi`) — returns 400 with field-level details.
 *  - **SQLite errors** (`err.code` starting with `SQLITE_`) — returns 500 with
 *    a generic message to avoid leaking internal details.
 *  - **All other errors** — returns the status code from `err.status` (or 500)
 *    with the error message.
 */

/**
 * Express error-handling middleware (four-argument signature).
 *
 * Must be registered **after** all route handlers so Express treats it as an
 * error handler rather than a regular middleware.
 *
 * @param {Error}  err  - The error object forwarded by `next(err)`.
 * @param {import('express').Request}  req  - Express request object.
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Express next function (required by signature).
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

  // SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while processing your request'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}

module.exports = {
  errorHandler
};
