const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../database/init');
const { emailSchema, otpVerifySchema } = require('../validation/schemas');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// In-memory OTP store: { email: { otp, expiresAt, attempts } }
const otpStore = new Map();

// Generate a 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Request OTP endpoint - sends OTP to email (simulated)
router.post('/request-otp', async (req, res, next) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email } = value;

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    // Store OTP
    otpStore.set(email, { otp, expiresAt, attempts: 0 });

    // In a production app, this would send an actual email.
    // For demo purposes, we log the OTP to the server console.
    console.log(`[OTP] Code for ${email}: ${otp}`);

    res.json({
      message: 'OTP sent successfully. Check your email.',
      // Include OTP in response for demo/testing purposes only
      // Remove this in production!
      _demo_otp: otp
    });
  } catch (error) {
    next(error);
  }
});

// Verify OTP endpoint - verifies OTP and logs user in
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { error, value } = otpVerifySchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email, otp } = value;

    // Check if OTP exists for this email
    const storedOtp = otpStore.get(email);
    if (!storedOtp) {
      return res.status(400).json({ error: 'No OTP requested for this email. Please request a new OTP.' });
    }

    // Check if OTP has expired
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts (max 5)
    if (storedOtp.attempts >= 5) {
      otpStore.delete(email);
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (storedOtp.otp !== otp) {
      storedOtp.attempts += 1;
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // OTP verified - clear it
    otpStore.delete(email);

    // Create user if doesn't exist, then return user info
    const db = getDatabase();

    db.get('SELECT email, created_at FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (row) {
        return res.json({
          message: 'Login successful',
          user: {
            email: row.email,
            createdAt: row.created_at
          }
        });
      } else {
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

// Legacy login endpoint - kept for backward compatibility
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
        return res.json({
          message: 'Login successful',
          user: {
            email: row.email,
            createdAt: row.created_at
          }
        });
      } else {
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

// Get current user info
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

// Export for testing
router._otpStore = otpStore;
router._generateOTP = generateOTP;

module.exports = router;
