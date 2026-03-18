/**
 * @module routes/auth
 * @description Authentication route handlers.
 *
 * Mounted at `/api/auth`. Provides endpoints for user login (with
 * auto-registration) and retrieving the current user's profile.
 *
 * Authentication is email-based — no password is required. A valid email in
 * the request body (for login) or the `x-user-email` header (for /me) is
 * sufficient.
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { emailSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 *
 * Authenticates (or registers) a user by email address.
 *
 * - If the email already exists, returns the existing user record.
 * - If the email is new, creates a user row and returns it with a 201 status.
 *
 * Request body — validated by {@link module:validation/schemas~emailSchema}:
 * ```json
 * { "email": "user@example.com" }
 * ```
 *
 * Success response (200 | 201):
 * ```json
 * {
 *   "message": "Login successful",
 *   "user": { "email": "user@example.com", "createdAt": "2024-01-01T00:00:00.000Z" }
 * }
 * ```
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
 * Returns the profile of the currently authenticated user.
 *
 * Requires the `x-user-email` header (enforced by {@link module:middleware/auth~authenticateUser}).
 *
 * Success response (200):
 * ```json
 * {
 *   "user": { "email": "user@example.com", "createdAt": "2024-01-01T00:00:00.000Z" }
 * }
 * ```
 *
 * Error responses:
 * - `401` — missing `x-user-email` header.
 * - `404` — user record not found.
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
