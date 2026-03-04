/**
 * @module middleware/auth
 * @description Express middleware for email-based user authentication.
 *
 * Authenticates requests by reading the `x-user-email` header. If the email
 * belongs to an existing user the request proceeds; otherwise a new user row
 * is created automatically (auto-registration). On success the authenticated
 * email is attached to `req.userEmail` for downstream handlers.
 *
 * **Header required:** `x-user-email` (valid email address)
 *
 * **Possible error responses:**
 * | Status | Condition                          |
 * |--------|------------------------------------|  
 * | 400    | Missing or malformed email address  |
 * | 401    | `x-user-email` header not provided  |
 * | 500    | Database read/write failure         |
 */

const { getDatabase } = require('../database/init');

/**
 * Express middleware that verifies the `x-user-email` header, validates its
 * format, looks up (or creates) the corresponding user in the database, and
 * attaches the verified email to `req.userEmail`.
 *
 * @param {import('express').Request} req  - Express request object. Must contain
 *   the `x-user-email` header with a valid email address.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {void}
 *
 * @example
 * // Apply to a single route
 * router.get('/profile', authenticateUser, (req, res) => {
 *   // req.userEmail is guaranteed to be set here
 *   res.json({ email: req.userEmail });
 * });
 *
 * @example
 * // Apply to all routes on a router
 * router.use(authenticateUser);
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
