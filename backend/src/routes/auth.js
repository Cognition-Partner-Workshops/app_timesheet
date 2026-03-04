/**
 * @module routes/auth
 * @description Authentication route handlers.
 *
 * Provides endpoints for user login (with auto-registration) and retrieving
 * the current authenticated user's profile.
 *
 * **Endpoints:**
 *
 * | Method | Path             | Auth | Description                          |
 * |--------|------------------|------|--------------------------------------|
 * | POST   | `/api/auth/login`| No   | Login or register with email         |
 * | GET    | `/api/auth/me`   | Yes  | Get current authenticated user info  |
 *
 * **POST `/api/auth/login`**
 * - Request body: `{ email: string }` (validated by {@link module:validation/schemas.emailSchema})
 * - 200 response (existing user): `{ message, user: { email, createdAt } }`
 * - 201 response (new user): `{ message, user: { email, createdAt } }`
 * - 400 response: Joi validation error
 *
 * **GET `/api/auth/me`**
 * - Requires `x-user-email` header (see {@link module:middleware/auth.authenticateUser})
 * - 200 response: `{ user: { email, createdAt } }`
 * - 404 response: `{ error: "User not found" }`
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { emailSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 *
 * Authenticates a user by email. If the email is not yet registered a new
 * user record is created automatically. Returns the user object on success.
 *
 * @name PostLogin
 * @route {POST} /api/auth/login
 * @bodyparam {string} email - A valid email address.
 * @returns {object} 200 - `{ message, user }` for existing users.
 * @returns {object} 201 - `{ message, user }` for newly created users.
 * @returns {object} 400 - Joi validation error forwarded to error handler.
 * @returns {object} 500 - Database error.
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
 * Returns the profile of the currently authenticated user identified by the
 * `x-user-email` header. Requires the {@link module:middleware/auth.authenticateUser}
 * middleware.
 *
 * @name GetMe
 * @route {GET} /api/auth/me
 * @headerparam {string} x-user-email - Authenticated user's email.
 * @returns {object} 200 - `{ user: { email, createdAt } }`
 * @returns {object} 404 - `{ error: "User not found" }`
 * @returns {object} 500 - Database error.
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
