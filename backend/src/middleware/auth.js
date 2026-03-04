/**
 * @module middleware/auth
 * @description Express middleware for email-based user authentication.
 *
 * Every authenticated request must include an `x-user-email` header containing
 * a valid email address. If the email does not yet exist in the `users` table
 * the middleware automatically creates a new user record before allowing the
 * request to proceed.
 */

const { getDatabase } = require('../database/init');

/**
 * Authenticates the current request by inspecting the `x-user-email` header.
 *
 * Processing steps:
 * 1. Extracts the email from the `x-user-email` request header.
 * 2. Validates the email format using a basic regex pattern.
 * 3. Looks the user up in the `users` table.
 * 4. If the user does not exist, inserts a new row.
 * 5. Attaches the verified email to `req.userEmail` for downstream handlers.
 *
 * @param {import('express').Request} req  - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {void}
 *
 * @example
 * // Apply to a single route
 * router.get('/profile', authenticateUser, (req, res) => {
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
