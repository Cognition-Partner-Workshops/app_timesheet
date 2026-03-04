/**
 * @module middleware/errorHandler
 * @description Centralized Express error-handling middleware.
 *
 * Catches errors forwarded via `next(err)` and returns a consistent JSON
 * error response. Handles the following error categories:
 *
 * | Category              | HTTP Status          | Response Shape                              |
 * |-----------------------|----------------------|---------------------------------------------|
 * | Joi validation errors | 400                  | `{ error: "Validation error", details: [] }` |
 * | SQLite errors         | 500                  | `{ error: "Database error", message: "..." }` |
 * | All other errors      | `err.status` or 500  | `{ error: "..." }`                           |
 */

/**
 * Express error-handling middleware (four-argument signature). Inspects the
 * error instance to determine the appropriate HTTP status code and response
 * body format.
 *
 * - **Joi validation errors** (`err.isJoi === true`): returns 400 with an
 *   array of human-readable validation messages in `details`.
 * - **SQLite errors** (error code prefixed with `SQLITE_`): returns 500 with
 *   a generic database error message (to avoid leaking internals).
 * - **All other errors**: uses `err.status` if set, otherwise defaults to 500,
 *   and returns `err.message` or a generic message.
 *
 * @param {Error} err   - The error object forwarded by `next(err)`.
 * @param {import('express').Request} req  - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function (unused but
 *   required by Express to recognise the four-argument error-handler signature).
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
