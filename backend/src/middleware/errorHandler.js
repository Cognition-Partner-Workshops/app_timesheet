/**
 * @module middleware/errorHandler
 * @description Centralised Express error-handling middleware.
 *
 * This middleware is registered **after** all route handlers in the Express
 * pipeline so that any error thrown or passed to `next(err)` is caught here.
 * It distinguishes between:
 *
 * - **Joi validation errors** — returns 400 with a human-readable details array.
 * - **SQLite errors** (code prefix `SQLITE_`) — returns a generic 500 to avoid
 *   leaking internal database details.
 * - **All other errors** — returns the status on the error object (or 500) and
 *   the error message.
 */

/**
 * Express error-handling middleware (four-argument signature).
 *
 * Logs every error to the console for observability, then maps it to an
 * appropriate HTTP status code and JSON response body.
 *
 * @param {Error & { isJoi?: boolean, code?: string, status?: number }} err
 *   The error object — may be a Joi validation error, a SQLite driver error,
 *   or any generic Error.
 * @param {import('express').Request} req  - The incoming request.
 * @param {import('express').Response} res - The outgoing response.
 * @param {import('express').NextFunction} next - Next middleware (required by
 *   Express to recognise this as an error handler even though it is unused).
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
