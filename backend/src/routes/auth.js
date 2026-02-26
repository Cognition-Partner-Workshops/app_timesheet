/**
 * @module routes/auth
 * @description Authentication route handlers mounted at `/api/auth`.
 *
 * Endpoints:
 * | Method | Path           | Auth required | Description                               |
 * |--------|----------------|---------------|-------------------------------------------|
 * | POST   | `/api/auth/login` | No         | Log in (or auto-register) with an email.  |
 * | GET    | `/api/auth/me`    | Yes        | Retrieve the current user's profile.      |
 *
 * Authentication is email-only — no password is required. On the first login
 * with a new email a `users` row is created automatically.
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { emailSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 *
 * Validates the request body against {@link module:validation/schemas~emailSchema},
 * then either returns the existing user or creates a new one.
 *
 * @route POST /api/auth/login
 * @group Auth
 * @param {object} req.body - `{ email: string }` — the user's email address.
 * @returns {object} 200 — `{ message, user: { email, createdAt } }` for existing users.
 * @returns {object} 201 — same shape for newly-created users.
 * @returns {object} 400 — Joi validation error forwarded to the error handler.
 * @returns {object} 500 — database error.
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
 * Returns the profile of the currently-authenticated user. Requires the
 * `x-user-email` header (enforced by {@link module:middleware/auth~authenticateUser}).
 *
 * @route GET /api/auth/me
 * @group Auth
 * @returns {object} 200 — `{ user: { email, createdAt } }`.
 * @returns {object} 401 — missing or invalid `x-user-email` header.
 * @returns {object} 404 — user record not found in the database.
 * @returns {object} 500 — database error.
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
