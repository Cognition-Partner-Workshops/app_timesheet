/**
 * @module middleware/auth
 * @description Express middleware for email-based user authentication.
 *
 * This middleware implements a lightweight authentication scheme where the
 * caller provides their email address via the `x-user-email` HTTP header.
 * The middleware validates the email format, looks up (or auto-creates) the
 * user in the database, and attaches the verified email to `req.userEmail`
 * for downstream route handlers.
 *
 * This approach is intentionally simple - there are no passwords. In
 * production the JWT layer (configured in the Docker production override)
 * provides the actual token verification step before this middleware runs.
 */

const { getDatabase } = require('../database/init');

/**
 * Authenticates an incoming request by inspecting the `x-user-email` header.
 *
 * Behaviour:
 * 1. Rejects the request with `401` if the header is missing.
 * 2. Rejects the request with `400` if the email format is invalid.
 * 3. Looks up the email in the `users` table.
 *    - If the user exists, attaches `req.userEmail` and continues.
 *    - If the user does not exist, creates a new row and then continues.
 * 4. Returns `500` if any database operation fails.
 *
 * @param {import('express').Request}  req  - Express request object.
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {void}
 */
function authenticateUser(req, res, next) {
  const userEmail = req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User email required in x-user-email header' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const db = getDatabase();
  
  // Check if user exists, create if not
  db.get('SELECT email FROM users WHERE email = ?', [userEmail], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!row) {
      // Create new user
      db.run('INSERT INTO users (email) VALUES (?)', [userEmail], (err) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        
        req.userEmail = userEmail;
        next();
      });
    } else {
      req.userEmail = userEmail;
      next();
    }
  });
}

module.exports = {
  authenticateUser
};
