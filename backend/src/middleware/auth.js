/**
 * @module middleware/auth
 * @description Express middleware for email-based user authentication.
 *
 * Every protected route should apply {@link authenticateUser} which:
 * 1. Reads the `x-user-email` request header.
 * 2. Validates the email format with a regex check.
 * 3. Looks the email up in the `users` table — auto-creates the row on first
 *    login so that new users are seamlessly onboarded.
 * 4. Attaches the verified email to `req.userEmail` for downstream handlers.
 */

const { getDatabase } = require('../database/init');

/**
 * Authenticates incoming requests via the `x-user-email` header.
 *
 * If the email does not yet exist in the `users` table, a new row is inserted
 * automatically (self-registration). On success the validated email is stored
 * on `req.userEmail` so route handlers can scope queries to the current user.
 *
 * @param {import('express').Request} req  - Express request; expects header `x-user-email`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Calls the next middleware on success.
 * @returns {void}
 *
 * @example
 * // Apply to a single route:
 * router.get('/protected', authenticateUser, (req, res) => {
 *   res.json({ email: req.userEmail });
 * });
 *
 * @example
 * // Apply to all routes on a router:
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
