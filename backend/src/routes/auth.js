/**
 * @module routes/auth
 * @description Authentication routes for user login and profile retrieval.
 *
 * This module exposes two endpoints:
 *   POST /api/auth/login  - Log in (or auto-register) a user by email.
 *   GET  /api/auth/me     - Retrieve the currently authenticated user's profile.
 *
 * Authentication is email-based: the client sends an email address and, if the
 * user does not yet exist, a new record is created automatically.
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { emailSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 *
 * Authenticates a user by email address.  If the email does not exist in the
 * database the user is created on the fly.
 *
 * @route  POST /api/auth/login
 * @param  {Object}  req.body
 * @param  {string}  req.body.email - Valid email address (validated via Joi).
 * @returns {Object}  200 - { message, user: { email, createdAt } } for existing users.
 * @returns {Object}  201 - { message, user: { email, createdAt } } for newly created users.
 * @returns {Object}  400 - Validation error forwarded to the error handler.
 * @returns {Object}  500 - Internal server / database error.
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
 * Returns the profile of the currently authenticated user.  Requires the
 * `x-user-email` header to be set (handled by the authenticateUser middleware).
 *
 * @route   GET /api/auth/me
 * @middleware authenticateUser
 * @returns {Object}  200 - { user: { email, createdAt } }
 * @returns {Object}  404 - User not found.
 * @returns {Object}  500 - Internal server / database error.
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
