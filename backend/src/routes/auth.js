/**
 * @module routes/auth
 * @description Authentication route handlers for user login and profile retrieval.
 *
 * Provides two endpoints:
 * - `POST /api/auth/login` - Authenticates a user by email, auto-creating the
 *   account on first login. No password is required.
 * - `GET  /api/auth/me`    - Returns the authenticated user's profile information.
 *
 * The login endpoint validates the email against the {@link module:validation/schemas~emailSchema}
 * and either returns the existing user or inserts a new row into the `users` table.
 *
 * @see module:middleware/auth
 * @see module:validation/schemas
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { emailSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 *
 * Authenticates a user by email address. If the email does not exist in the
 * `users` table a new account is created automatically.
 *
 * @route POST /api/auth/login
 * @param {Object} req.body
 * @param {string} req.body.email - The user's email address (validated by Joi).
 * @returns {Object} 200 - `{ message, user: { email, createdAt } }` for existing users.
 * @returns {Object} 201 - `{ message, user: { email, createdAt } }` for newly created users.
 * @returns {Object} 400 - Validation error if the email is missing or malformed.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email } = value;
    const db = getDatabase();

    // Check if user exists
    db.get('SELECT email, created_at FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (row) {
        // User exists
        return res.json({
          message: 'Login successful',
          user: {
            email: row.email,
            createdAt: row.created_at
          }
        });
      } else {
        // Create new user
        db.run('INSERT INTO users (email) VALUES (?)', [email], function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }

          res.status(201).json({
            message: 'User created and logged in successfully',
            user: {
              email: email,
              createdAt: new Date().toISOString()
            }
          });
        });
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 *
 * Returns the profile of the currently authenticated user. Requires a valid
 * `x-user-email` header (enforced by the {@link module:middleware/auth~authenticateUser}
 * middleware).
 *
 * @route GET /api/auth/me
 * @returns {Object} 200 - `{ user: { email, createdAt } }`
 * @returns {Object} 401 - Missing or invalid authentication header.
 * @returns {Object} 404 - User record not found in the database.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.get('/me', authenticateUser, (req, res) => {
  const db = getDatabase();
  
  db.get('SELECT email, created_at FROM users WHERE email = ?', [req.userEmail], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        email: row.email,
        createdAt: row.created_at
      }
    });
  });
});

module.exports = router;
