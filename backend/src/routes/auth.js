const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../database/init');
const { emailSchema, sendOtpSchema, verifyOtpSchema } = require('../validation/schemas');
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

// Send OTP to mobile number
router.post('/send-otp', async (req, res, next) => {
  try {
    const { error, value } = sendOtpSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { mobile } = value;
    const db = getDatabase();

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Invalidate any existing unused OTPs for this mobile
    db.run(
      'UPDATE otp_codes SET used = 1 WHERE mobile = ? AND used = 0',
      [mobile],
      function(err) {
        if (err) {
          console.error('Error invalidating old OTPs:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        // Store new OTP
        db.run(
          'INSERT INTO otp_codes (mobile, otp_code, expires_at) VALUES (?, ?, ?)',
          [mobile, otpCode, expiresAt],
          function(err) {
            if (err) {
              console.error('Error storing OTP:', err);
              return res.status(500).json({ error: 'Failed to generate OTP' });
            }

            // In a real app, send OTP via SMS service
            console.log(`[OTP] Code for ${mobile}: ${otpCode} (expires at ${expiresAt})`);

            res.json({
              message: 'OTP sent successfully',
              mobile: mobile,
              // Include OTP in response for development/testing
              ...(process.env.NODE_ENV !== 'production' && { otpCode })
            });
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { error, value } = verifyOtpSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { mobile, otpCode } = value;
    const db = getDatabase();

    // Find valid OTP
    db.get(
      'SELECT * FROM otp_codes WHERE mobile = ? AND otp_code = ? AND used = 0 AND expires_at > datetime(\'now\')',
      [mobile, otpCode],
      (err, otpRecord) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!otpRecord) {
          return res.status(401).json({ error: 'Invalid or expired OTP' });
        }

        // Mark OTP as used
        db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpRecord.id], (err) => {
          if (err) {
            console.error('Error marking OTP as used:', err);
            // Continue anyway - OTP was valid
          }

          // Find or create user by mobile
          db.get('SELECT email, mobile, created_at FROM users WHERE mobile = ?', [mobile], (err, existingUser) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }

            if (existingUser) {
              return res.json({
                message: 'Login successful',
                user: {
                  email: existingUser.email,
                  mobile: existingUser.mobile,
                  createdAt: existingUser.created_at
                }
              });
            }

            // Create new user with generated email from mobile
            const generatedEmail = `${mobile}@mobile.timesheet.app`;
            db.run(
              'INSERT INTO users (email, mobile) VALUES (?, ?)',
              [generatedEmail, mobile],
              function(err) {
                if (err) {
                  console.error('Error creating user:', err);
                  return res.status(500).json({ error: 'Failed to create user' });
                }

                res.status(201).json({
                  message: 'User created and logged in successfully',
                  user: {
                    email: generatedEmail,
                    mobile: mobile,
                    createdAt: new Date().toISOString()
                  }
                });
              }
            );
          });
        });
      }
    );
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

module.exports = router;
