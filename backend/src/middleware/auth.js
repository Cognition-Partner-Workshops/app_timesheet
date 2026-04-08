/**
 * @module middleware/auth
 * @description Express middleware for email-based user authentication.
 *
 * Every protected route should apply {@link authenticateUser} to verify the
 * caller's identity via the `x-user-email` request header. If the email
 * belongs to a new user the middleware auto-registers them in the `users`
 * table before continuing.
 *
 * After successful authentication the verified email is available on
 * `req.userEmail` for downstream handlers.
 */

const { getDatabase } = require('../database/init');

/**
 * Express middleware that authenticates requests using the `x-user-email` header.
 *
 * Flow:
 *  1. Reads `x-user-email` from the request headers.
 *  2. Validates the value against a basic email regex.
 *  3. Looks the email up in the `users` table.
 *  4. If the user does not exist, inserts a new row (auto-registration).
 *  5. Attaches the verified email to `req.userEmail` and calls `next()`.
 *
 * @param {import('express').Request}  req  - Express request object.
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {void}
 *
 * @example
 * // Protect a single route
 * router.get('/profile', authenticateUser, (req, res) => {
 *   res.json({ email: req.userEmail });
 * });
 *
 * @example
 * // Protect all routes on a router
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
