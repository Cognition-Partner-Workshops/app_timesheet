/**
 * @module middleware/errorHandler
 * @description Centralised Express error-handling middleware.
 *
 * Catches errors forwarded via `next(err)` and translates them into
 * consistent JSON error responses. The handler recognises two special
 * error categories:
 *
 * - **Joi validation errors** (`err.isJoi === true`) - mapped to HTTP 400
 *   with an array of human-readable detail messages.
 * - **SQLite errors** (`err.code` starting with `SQLITE_`) - mapped to
 *   HTTP 500 with a generic message to avoid leaking internal details.
 *
 * All other errors fall through to a default branch that uses the status
 * code attached to the error (if any) or defaults to HTTP 500.
 */

/**
 * Express error-handling middleware (four-argument signature).
 *
 * Must be registered *after* all route handlers so that errors thrown or
 * passed via `next(err)` are caught here.
 *
 * @param {Error}  err  - The error object.
 * @param {import('express').Request}  req  - Express request object.
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Express next function (unused but
 *   required by Express to recognise this as an error handler).
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
