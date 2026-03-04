const request = require('supertest');
const express = require('express');
const clientRoutes = require('../../routes/clients');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    req.userEmail = 'test@example.com';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/clients', clientRoutes);
// Add error handler for Joi validation
app.use((err, req, res, next) => {
  if (err.isJoi) {
    return res.status(400).json({ error: 'Validation error' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

describe('Client Routes', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };
    getDatabase.mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/clients', () => {
    test('should return all clients for authenticated user', async () => {
      const mockClients = [
        { id: 1, name: 'Client A', description: 'Desc A', created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 2, name: 'Client B', description: 'Desc B', created_at: '2024-01-02', updated_at: '2024-01-02' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockClients, rowCount: 2 });

      const response = await request(app).get('/api/clients');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ clients: mockClients });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, description'),
        ['test@example.com']
      );
    });

    test('should return empty array when no clients exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).get('/api/clients');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ clients: [] });
    });

    test('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/clients');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('GET /api/clients/:id', () => {
    test('should return specific client', async () => {
      const mockClient = { id: 1, name: 'Client A', description: 'Desc A' };

      mockPool.query.mockResolvedValueOnce({ rows: [mockClient], rowCount: 1 });

      const response = await request(app).get('/api/clients/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ client: mockClient });
    });

    test('should return 404 if client not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).get('/api/clients/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Client not found' });
    });

    test('should return 400 for invalid client ID', async () => {
      const response = await request(app).get('/api/clients/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid client ID' });
    });

    test('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/clients/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /api/clients', () => {
    test('should create new client with valid data', async () => {
      const newClient = { name: 'New Client', description: 'New Description' };
      const createdClient = { id: 1, ...newClient, created_at: '2024-01-01', updated_at: '2024-01-01' };

      mockPool.query.mockResolvedValueOnce({ rows: [createdClient], rowCount: 1 });

      const response = await request(app)
        .post('/api/clients')
        .send(newClient);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Client created successfully');
      expect(response.body.client).toEqual(createdClient);
    });

    test('should create client without description', async () => {
      const newClient = { name: 'Client Without Desc' };
      const createdClient = { id: 1, name: 'Client Without Desc', description: null };

      mockPool.query.mockResolvedValueOnce({ rows: [createdClient], rowCount: 1 });

      const response = await request(app)
        .post('/api/clients')
        .send(newClient);

      expect(response.status).toBe(201);
    });

    test('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/clients')
        .send({ description: 'No name provided' });

      expect(response.status).toBe(400);
    });

    test('should return 400 for empty name', async () => {
      const response = await request(app)
        .post('/api/clients')
        .send({ name: '' });

      expect(response.status).toBe(400);
    });

    test('should handle database insert error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Insert failed'));

      const response = await request(app)
        .post('/api/clients')
        .send({ name: 'Test Client' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create client' });
    });
  });

  describe('PUT /api/clients/:id', () => {
    test('should update client name', async () => {
      const updatedClient = { id: 1, name: 'Updated Name', description: 'Old Desc' };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockResolvedValueOnce({ rows: [updatedClient], rowCount: 1 }); // Update RETURNING

      const response = await request(app)
        .put('/api/clients/1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client updated successfully');
      expect(response.body.client).toEqual(updatedClient);
    });

    test('should update client description', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Client', description: 'New Description' }], rowCount: 1 }); // Update RETURNING

      const response = await request(app)
        .put('/api/clients/1')
        .send({ description: 'New Description' });

      expect(response.status).toBe(200);
    });

    test('should return 404 if client not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .put('/api/clients/999')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Client not found' });
    });

    test('should return 400 for invalid client ID', async () => {
      const response = await request(app)
        .put('/api/clients/invalid')
        .send({ name: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid client ID' });
    });

    test('should return 400 for empty update', async () => {
      const response = await request(app)
        .put('/api/clients/1')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/clients/:id', () => {
    test('should delete existing client', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Delete

      const response = await request(app).delete('/api/clients/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Client deleted successfully' });
    });

    test('should return 404 if client not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).delete('/api/clients/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Client not found' });
    });

    test('should return 400 for invalid client ID', async () => {
      const response = await request(app).delete('/api/clients/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid client ID' });
    });

    test('should handle database delete error', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockRejectedValueOnce(new Error('Delete failed')); // Delete fails

      const response = await request(app).delete('/api/clients/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete client' });
    });

    test('should handle database error when checking client existence', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).delete('/api/clients/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete client' });
    });
  });

  describe('POST /api/clients - Error Handling', () => {
    test('should handle insert error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Insert failed'));

      const response = await request(app)
        .post('/api/clients')
        .send({ name: 'Test Client' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create client' });
    });
  });

  describe('PUT /api/clients/:id - Error Handling', () => {
    test('should handle database error when checking client existence', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/clients/1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update client' });
    });

    test('should handle database error during update', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockRejectedValueOnce(new Error('Update failed')); // Update fails

      const response = await request(app)
        .put('/api/clients/1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update client' });
    });

    test('should update both name and description', async () => {
      const updatedClient = { id: 1, name: 'New Name', description: 'New Description' };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockResolvedValueOnce({ rows: [updatedClient], rowCount: 1 }); // Update RETURNING

      const response = await request(app)
        .put('/api/clients/1')
        .send({ name: 'New Name', description: 'New Description' });

      expect(response.status).toBe(200);
      expect(response.body.client).toEqual(updatedClient);
    });

    test('should update description to null when empty string provided', async () => {
      const updatedClient = { id: 1, name: 'Client', description: null };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockResolvedValueOnce({ rows: [updatedClient], rowCount: 1 }); // Update RETURNING

      const response = await request(app)
        .put('/api/clients/1')
        .send({ description: '' });

      expect(response.status).toBe(200);
    });
  });
});
