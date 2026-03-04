/**
 * @module middleware/errorHandler
 * @description Centralized Express error-handling middleware.
 *
 * Catches errors forwarded by route handlers via `next(error)` and returns a
 * consistently shaped JSON error response. Specific error types are detected
 * and mapped to appropriate HTTP status codes:
 *
 * | Error type        | Status | Payload shape                              |
 * |-------------------|--------|--------------------------------------------|  
 * | Joi validation    | 400    | `{ error, details[] }`                     |
 * | SQLite (`SQLITE_`)| 500    | `{ error, message }` (generic message)     |
 * | Everything else   | `err.status` or 500 | `{ error }`               |
 */

/**
 * Express error-handling middleware that formats errors into JSON responses.
 *
 * Must be registered **after** all route handlers so that Express recognises
 * it as an error handler (four-parameter signature).
 *
 * @param {Error} err  - The error object thrown or passed to `next()`.
 * @param {import('express').Request} req  - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
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
