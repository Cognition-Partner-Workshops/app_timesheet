const express = require('express');
const { getDatabase } = require('../database/init');
const { emailSchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Login endpoint - creates user if doesn't exist
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email } = value;
    const pool = getDatabase();

    const { rows } = await pool.query(
      'SELECT email, created_at FROM users WHERE email = $1',
      [email]
    );

    if (rows[0]) {
      return res.json({
        message: 'Login successful',
        user: {
          email: rows[0].email,
          createdAt: rows[0].created_at
        }
      });
    }

    await pool.query('INSERT INTO users (email) VALUES ($1)', [email]);

    res.status(201).json({
      message: 'User created and logged in successfully',
      user: {
        email: email,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user info
router.get('/me', authenticateUser, async (req, res, next) => {
  try {
    const pool = getDatabase();

    const { rows } = await pool.query(
      'SELECT email, created_at FROM users WHERE email = $1',
      [req.userEmail]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        email: rows[0].email,
        createdAt: rows[0].created_at
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
