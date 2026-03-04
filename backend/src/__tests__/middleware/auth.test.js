const { authenticateUser } = require('../../middleware/auth');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');

describe('Authentication Middleware', () => {
  let req, res, next, mockPool;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    mockPool = {
      query: jest.fn()
    };

    getDatabase.mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Header Validation', () => {
    test('should return 401 if x-user-email header is missing', async () => {
      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User email required in x-user-email header'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 if email format is invalid', async () => {
      req.headers['x-user-email'] = 'invalid-email';

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid email format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should accept valid email format', async () => {
      req.headers['x-user-email'] = 'test@example.com';

      mockPool.query.mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }], rowCount: 1 });

      await authenticateUser(req, res, next);

      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('Existing User Authentication', () => {
    test('should authenticate existing user and call next()', async () => {
      req.headers['x-user-email'] = 'existing@example.com';

      mockPool.query.mockResolvedValueOnce({ rows: [{ email: 'existing@example.com' }], rowCount: 1 });

      await authenticateUser(req, res, next);

      expect(req.userEmail).toBe('existing@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle database error when checking user', async () => {
      req.headers['x-user-email'] = 'test@example.com';

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('New User Creation', () => {
    test('should create new user if not exists and call next()', async () => {
      req.headers['x-user-email'] = 'newuser@example.com';

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // User doesn't exist
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert

      await authenticateUser(req, res, next);

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO users (email) VALUES ($1)',
        ['newuser@example.com']
      );
      expect(req.userEmail).toBe('newuser@example.com');
      expect(next).toHaveBeenCalled();
    });

    test('should handle error when creating new user', async () => {
      req.headers['x-user-email'] = 'newuser@example.com';

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // User doesn't exist
        .mockRejectedValueOnce(new Error('Insert failed')); // Insert fails

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Email Format Edge Cases', () => {
    test('should reject email without @', async () => {
      req.headers['x-user-email'] = 'notanemail';
      await authenticateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject email without domain', async () => {
      req.headers['x-user-email'] = 'test@';
      await authenticateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject email without TLD', async () => {
      req.headers['x-user-email'] = 'test@domain';
      await authenticateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should accept email with subdomain', async () => {
      req.headers['x-user-email'] = 'test@mail.example.com';

      mockPool.query.mockResolvedValueOnce({ rows: [{ email: 'test@mail.example.com' }], rowCount: 1 });

      await authenticateUser(req, res, next);
      expect(mockPool.query).toHaveBeenCalled();
    });
  });
});
