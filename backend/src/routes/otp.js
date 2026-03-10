const express = require('express');
const { getDatabase } = require('../database/init');
const { phoneSchema, otpVerifySchema } = require('../validation/schemas');

const router = express.Router();

// Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP to phone number
router.post('/send', async (req, res, next) => {
  try {
    const { error, value } = phoneSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { phone } = value;
    const db = getDatabase();
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Invalidate any existing unused OTPs for this phone
    db.run(
      'UPDATE otp_codes SET used = 1 WHERE phone = ? AND used = 0',
      [phone],
      (err) => {
        if (err) {
          console.error('Error invalidating old OTPs:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        // Store the new OTP
        db.run(
          'INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)',
          [phone, otp, expiresAt],
          (err) => {
            if (err) {
              console.error('Error storing OTP:', err);
              return res.status(500).json({ error: 'Failed to generate OTP' });
            }

            // In a real application, this would send an SMS via a provider like Twilio
            // For demo purposes, we log it to the console
            console.log(`[OTP] Code for ${phone}: ${otp} (expires: ${expiresAt})`);

            res.json({
              message: 'OTP sent successfully',
              phone: phone,
              // Include OTP in response for demo/testing purposes
              // Remove this in production!
              demo_otp: otp
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
router.post('/verify', async (req, res, next) => {
  try {
    const { error, value } = otpVerifySchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { phone, otp } = value;
    const db = getDatabase();

    // Find a valid, unused OTP for this phone
    db.get(
      'SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND used = 0 AND expires_at > datetime(\'now\')',
      [phone, otp],
      (err, otpRow) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!otpRow) {
          return res.status(401).json({ error: 'Invalid or expired OTP' });
        }

        // Mark OTP as used
        db.run(
          'UPDATE otp_codes SET used = 1 WHERE id = ?',
          [otpRow.id],
          (err) => {
            if (err) {
              console.error('Error marking OTP as used:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }

            // Use phone number as user identifier (prefixed for clarity)
            const userEmail = `phone:${phone}`;

            // Check if user exists, create if not
            db.get(
              'SELECT email, created_at FROM users WHERE email = ?',
              [userEmail],
              (err, userRow) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Internal server error' });
                }

                if (userRow) {
                  return res.json({
                    message: 'Login successful',
                    user: {
                      email: userRow.email,
                      createdAt: userRow.created_at
                    }
                  });
                }

                // Create new user with phone-based identifier
                db.run(
                  'INSERT INTO users (email) VALUES (?)',
                  [userEmail],
                  function (err) {
                    if (err) {
                      console.error('Error creating user:', err);
                      return res.status(500).json({ error: 'Failed to create user' });
                    }

                    res.status(201).json({
                      message: 'User created and logged in successfully',
                      user: {
                        email: userEmail,
                        createdAt: new Date().toISOString()
                      }
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
