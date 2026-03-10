const request = require('supertest');
const express = require('express');
const otpRoutes = require('../../routes/otp');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');

const app = express();
app.use(express.json());
app.use('/api/auth/otp', otpRoutes);
// Add error handler for Joi validation
app.use((err, req, res, next) => {
  if (err.isJoi) {
    return res.status(400).json({ error: 'Validation error', details: err.details[0].message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

describe('OTP Routes', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      run: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/otp/send', () => {
    test('should send OTP for valid phone number', async () => {
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      const response = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '+1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP sent successfully');
      expect(response.body.phone).toBe('+1234567890');
      expect(response.body.demo_otp).toBeDefined();
      expect(response.body.demo_otp).toMatch(/^\d{6}$/);
    });

    test('should send OTP for phone number without plus prefix', async () => {
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      const response = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP sent successfully');
    });

    test('should return 400 for invalid phone number', async () => {
      const response = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for missing phone number', async () => {
      const response = await request(app)
        .post('/api/auth/otp/send')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for empty phone number', async () => {
      const response = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should invalidate existing OTPs before creating new one', async () => {
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '+1234567890' });

      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE otp_codes SET used = 1 WHERE phone = ? AND used = 0',
        ['+1234567890'],
        expect.any(Function)
      );
    });

    test('should handle database error when invalidating old OTPs', async () => {
      mockDb.run.mockImplementation((query, params, callback) => {
        if (query.includes('UPDATE')) {
          callback(new Error('Database error'));
        } else {
          callback(null);
        }
      });

      const response = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '+1234567890' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle database error when storing OTP', async () => {
      let callCount = 0;
      mockDb.run.mockImplementation((query, params, callback) => {
        callCount++;
        if (callCount === 1) {
          // First call: invalidate old OTPs - success
          callback(null);
        } else {
          // Second call: insert new OTP - fail
          callback(new Error('Insert failed'));
        }
      });

      const response = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '+1234567890' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate OTP');
    });

    test('should handle unexpected errors in try-catch block', async () => {
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: '+1234567890' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /api/auth/otp/verify', () => {
    test('should verify valid OTP and login existing user', async () => {
      const otpRow = { id: 1, phone: '+1234567890', code: '123456', used: 0 };
      const userRow = { email: 'phone:+1234567890', created_at: '2024-01-01T00:00:00.000Z' };

      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('otp_codes')) {
          callback(null, otpRow);
        } else {
          callback(null, userRow);
        }
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe('phone:+1234567890');
    });

    test('should verify valid OTP and create new user', async () => {
      const otpRow = { id: 1, phone: '+1234567890', code: '123456', used: 0 };

      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('otp_codes')) {
          callback(null, otpRow);
        } else {
          callback(null, null); // User doesn't exist
        }
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '123456' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created and logged in successfully');
      expect(response.body.user.email).toBe('phone:+1234567890');
    });

    test('should return 401 for invalid OTP', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null); // No matching OTP found
      });

      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '999999' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired OTP');
    });

    test('should return 400 for invalid phone number format', async () => {
      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '123', otp: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for invalid OTP format', async () => {
      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for non-numeric OTP', async () => {
      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: 'abcdef' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for missing phone', async () => {
      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ otp: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for missing OTP', async () => {
      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should handle database error when checking OTP', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '123456' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle database error when marking OTP as used', async () => {
      const otpRow = { id: 1, phone: '+1234567890', code: '123456', used: 0 };

      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('otp_codes')) {
          callback(null, otpRow);
        }
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(new Error('Update failed'));
      });

      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '123456' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle database error when checking user', async () => {
      const otpRow = { id: 1, phone: '+1234567890', code: '123456', used: 0 };

      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('otp_codes')) {
          callback(null, otpRow);
        } else {
          callback(new Error('Database error'), null);
        }
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '123456' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle database error when creating user', async () => {
      const otpRow = { id: 1, phone: '+1234567890', code: '123456', used: 0 };

      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('otp_codes')) {
          callback(null, otpRow);
        } else {
          callback(null, null); // User doesn't exist
        }
      });

      let runCallCount = 0;
      mockDb.run.mockImplementation((query, params, callback) => {
        runCallCount++;
        if (runCallCount === 1) {
          // First call: mark OTP as used - success
          callback(null);
        } else {
          // Second call: create user - fail
          callback(new Error('Insert failed'));
        }
      });

      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '123456' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create user');
    });

    test('should handle unexpected errors in try-catch block', async () => {
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '123456' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    test('should mark OTP as used after successful verification', async () => {
      const otpRow = { id: 42, phone: '+1234567890', code: '123456', used: 0 };
      const userRow = { email: 'phone:+1234567890', created_at: '2024-01-01T00:00:00.000Z' };

      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('otp_codes')) {
          callback(null, otpRow);
        } else {
          callback(null, userRow);
        }
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '+1234567890', otp: '123456' });

      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE otp_codes SET used = 1 WHERE id = ?',
        [42],
        expect.any(Function)
      );
    });
  });
});
