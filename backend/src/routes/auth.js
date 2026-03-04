/**
 * @module routes/auth
 * @description Authentication routes for user login and profile retrieval.
 *
 * Mounted at `/api/auth`. Provides a password-less, email-only authentication
 * flow: users supply their email address and are either logged in (if the
 * account already exists) or automatically registered and logged in.
 *
 * @requires express
 * @requires ../database/init
 * @requires ../validation/schemas
 * @requires ../middleware/auth
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
 * database a new user record is created automatically.
 *
 * @name LoginUser
 * @route {POST} /api/auth/login
 * @bodyparam {string} email - A valid email address.
 * @returns {object} 200 - `{ message, user: { email, createdAt } }` for existing users.
 * @returns {object} 201 - `{ message, user: { email, createdAt } }` for newly created users.
 * @returns {object} 400 - Joi validation error if the email is missing or invalid.
 * @returns {object} 500 - Internal server error on database failure.
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
 * @name GetCurrentUser
 * @route {GET} /api/auth/me
 * @headerparam {string} x-user-email - Authenticated user's email address.
 * @returns {object} 200 - `{ user: { email, createdAt } }`
 * @returns {object} 401 - Missing or invalid authentication header.
 * @returns {object} 404 - User record not found.
 * @returns {object} 500 - Internal server error on database failure.
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
