/**
 * @module middleware/auth
 * @description Simple email-based authentication middleware.
 *
 * Every protected route should use {@link authenticateUser} to ensure that
 * `req.userEmail` is set before the route handler executes.
 *
 * Authentication flow:
 * 1. Read the `x-user-email` header from the incoming request.
 * 2. Validate that it contains a syntactically valid email address.
 * 3. Look the email up in the `users` table.
 *    - If the user does **not** exist, automatically create a new record.
 * 4. Attach the email to `req.userEmail` and call `next()`.
 */

const { getDatabase } = require('../database/init');

/**
 * Express middleware that authenticates (and optionally auto-registers) a user
 * based on the `x-user-email` request header.
 *
 * On success the verified email is stored on `req.userEmail` for downstream
 * route handlers.
 *
 * @param {import('express').Request}  req  - Express request object.
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 *
 * @returns {void}
 *
 * @throws {401} If the `x-user-email` header is missing.
 * @throws {400} If the header value is not a valid email format.
 * @throws {500} On database errors during user lookup or creation.
 */
function authenticateUser(req, res, next) {
  const userEmail = req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User email required in x-user-email header' });
  }

  // Validate email format with a basic RFC 5322-ish regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const db = getDatabase();
  
  // Check if user exists; create automatically if not
  db.get('SELECT email FROM users WHERE email = ?', [userEmail], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!row) {
      // Auto-register the user
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
