const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');

let app;

function createApp() {
  const a = express();
  a.use(express.json());
  const authRoutes = require('../../routes/auth');
  a.use('/api/auth', authRoutes);
  a.use((err, req, res, next) => {
    if (err.isJoi) {
      return res.status(400).json({ error: 'Validation error' });
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  return a;
}

app = createApp();

describe('OTP Auth Routes', () => {
  let mockDb;

  let randomIntSpy;

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      run: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);
    randomIntSpy = jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/send-otp', () => {
    test('should send OTP for valid mobile number', async () => {
      mockDb.run.mockImplementation((query, params, callback) => {
        if (typeof callback === 'function') {
          callback.call({ changes: 0 }, null);
        }
      });

      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ mobile: '+1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP sent successfully');
      expect(response.body.mobile).toBe('+1234567890');
      expect(response.body.otpCode).toBe('123456');
    });

    test('should send OTP for mobile without + prefix', async () => {
      mockDb.run.mockImplementation((query, params, callback) => {
        if (typeof callback === 'function') {
          callback.call({ changes: 0 }, null);
        }
      });

      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ mobile: '1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP sent successfully');
    });

    test('should return 400 for invalid mobile number', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ mobile: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for missing mobile number', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for mobile starting with 0', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ mobile: '0123456789' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should handle database error when invalidating old OTPs', async () => {
      mockDb.run.mockImplementation((query, params, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Database error'));
        }
      });

      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ mobile: '+1234567890' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle database error when storing OTP', async () => {
      let callCount = 0;
      mockDb.run.mockImplementation((query, params, callback) => {
        if (typeof callback === 'function') {
          callCount++;
          if (callCount === 1) {
            callback.call({ changes: 0 }, null);
          } else {
            callback(new Error('Insert failed'));
          }
        }
      });

      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ mobile: '+1234567890' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate OTP');
    });

    test('should handle unexpected errors in try-catch block', async () => {
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ mobile: '+1234567890' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    test('should verify valid OTP and login existing user', async () => {
      const otpRecord = {
        id: 1,
        mobile: '+1234567890',
        otp_code: '123456',
        used: 0,
        expires_at: new Date(Date.now() + 300000).toISOString()
      };

      const existingUser = {
        email: '+1234567890@mobile.timesheet.app',
        mobile: '+1234567890',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, otpRecord);
        } else {
          callback(null, existingUser);
        }
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        if (typeof callback === 'function') {
          callback(null);
        }
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe('+1234567890@mobile.timesheet.app');
      expect(response.body.user.mobile).toBe('+1234567890');
    });

    test('should verify valid OTP and create new user', async () => {
      const otpRecord = {
        id: 1,
        mobile: '+9876543210',
        otp_code: '654321',
        used: 0,
        expires_at: new Date(Date.now() + 300000).toISOString()
      };

      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, otpRecord);
        } else {
          callback(null, null);
        }
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        if (typeof callback === 'function') {
          callback.call(this, null);
        }
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+9876543210', otpCode: '654321' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created and logged in successfully');
      expect(response.body.user.email).toBe('+9876543210@mobile.timesheet.app');
      expect(response.body.user.mobile).toBe('+9876543210');
    });

    test('should return 401 for invalid OTP', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: '000000' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired OTP');
    });

    test('should return 400 for invalid mobile format', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: 'abc', otpCode: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for invalid OTP format', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should handle database error when finding OTP', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: '123456' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle database error when finding user by mobile', async () => {
      const otpRecord = { id: 1, mobile: '+1234567890', otp_code: '123456', used: 0, expires_at: new Date(Date.now() + 300000).toISOString() };

      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, otpRecord);
        } else {
          callback(new Error('Database error'), null);
        }
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        if (typeof callback === 'function') callback(null);
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: '123456' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle database error when creating new user', async () => {
      const otpRecord = { id: 1, mobile: '+1234567890', otp_code: '123456', used: 0, expires_at: new Date(Date.now() + 300000).toISOString() };

      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, otpRecord);
        } else {
          callback(null, null);
        }
      });

      let runCallCount = 0;
      mockDb.run.mockImplementation((query, params, callback) => {
        if (typeof callback === 'function') {
          runCallCount++;
          if (runCallCount === 1) {
            callback(null);
          } else {
            callback(new Error('Insert failed'));
          }
        }
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: '123456' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create user');
    });

    test('should handle error marking OTP as used but still proceed', async () => {
      const otpRecord = { id: 1, mobile: '+1234567890', otp_code: '123456', used: 0, expires_at: new Date(Date.now() + 300000).toISOString() };
      const existingUser = { email: '+1234567890@mobile.timesheet.app', mobile: '+1234567890', created_at: '2024-01-01T00:00:00.000Z' };

      let getCallCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, otpRecord);
        } else {
          callback(null, existingUser);
        }
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Update failed'));
        }
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
    });

    test('should handle unexpected errors in try-catch block', async () => {
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: '123456' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    test('should return 400 for OTP with letters', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ mobile: '+1234567890', otpCode: 'abcdef' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });
});
