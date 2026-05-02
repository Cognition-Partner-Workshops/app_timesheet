const request = require('supertest');
const express = require('express');
const projectRoutes = require('../../routes/projects');
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
app.use('/api/projects', projectRoutes);
app.use((err, req, res, next) => {
  if (err.isJoi) return res.status(400).json({ error: 'Validation error' });
  res.status(500).json({ error: 'Internal server error' });
});

function mockRunWithLastID(id) {
  return function(query, params, callback) {
    this.lastID = id;
    callback.call(this, null);
  };
}

function mockRunError(msg) {
  return function(query, params, callback) {
    callback.call(this, new Error(msg));
  };
}

function mockCallback(err, data) {
  return (query, params, callback) => callback(err, data);
}

const sampleProject = {
  id: 1, name: 'Project A', description: 'Desc A',
  client_id: 1, start_date: '2024-01-01', status: 'active',
  client_name: 'Client A', created_at: '2024-01-01', updated_at: '2024-01-01'
};

describe('Project Routes', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = { all: jest.fn(), get: jest.fn(), run: jest.fn() };
    getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /api/projects', () => {
    test('returns all projects for authenticated user', async () => {
      mockDb.all.mockImplementation(mockCallback(null, [sampleProject]));
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(res.body.projects).toHaveLength(1);
      expect(res.body.projects[0].name).toBe('Project A');
    });

    test('returns empty array when none exist', async () => {
      mockDb.all.mockImplementation(mockCallback(null, []));
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ projects: [] });
    });

    test('handles database error', async () => {
      mockDb.all.mockImplementation(mockCallback(new Error('fail')));
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/projects/:id', () => {
    test('returns specific project', async () => {
      mockDb.get.mockImplementation(mockCallback(null, sampleProject));
      const res = await request(app).get('/api/projects/1');
      expect(res.status).toBe(200);
      expect(res.body.project.name).toBe('Project A');
    });

    test('returns 404 when not found', async () => {
      mockDb.get.mockImplementation(mockCallback(null, null));
      const res = await request(app).get('/api/projects/999');
      expect(res.status).toBe(404);
    });

    test('returns 400 for non-numeric ID', async () => {
      const res = await request(app).get('/api/projects/abc');
      expect(res.status).toBe(400);
    });

    test('handles database error', async () => {
      mockDb.get.mockImplementation(mockCallback(new Error('fail')));
      const res = await request(app).get('/api/projects/1');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/projects', () => {
    test('creates project without client', async () => {
      mockDb.run.mockImplementation(mockRunWithLastID(1));
      mockDb.get.mockImplementation(mockCallback(null, sampleProject));

      const res = await request(app).post('/api/projects').send({ name: 'New Project' });
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Project created successfully');
    });

    test('creates project with valid client', async () => {
      mockDb.get
        .mockImplementationOnce(mockCallback(null, { id: 1 }))
        .mockImplementationOnce(mockCallback(null, sampleProject));
      mockDb.run.mockImplementation(mockRunWithLastID(1));

      const res = await request(app).post('/api/projects').send({ name: 'P', clientId: 1 });
      expect(res.status).toBe(201);
    });

    test('rejects when assigned client not found', async () => {
      mockDb.get.mockImplementation(mockCallback(null, null));
      const res = await request(app).post('/api/projects').send({ name: 'P', clientId: 999 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Client not found/);
    });

    test('rejects missing name', async () => {
      const res = await request(app).post('/api/projects').send({ description: 'no name' });
      expect(res.status).toBe(400);
    });

    test('rejects invalid status', async () => {
      const res = await request(app).post('/api/projects').send({ name: 'P', status: 'bad' });
      expect(res.status).toBe(400);
    });

    test('handles insert error', async () => {
      mockDb.run.mockImplementation(mockRunError('insert fail'));
      const res = await request(app).post('/api/projects').send({ name: 'P' });
      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/projects/:id', () => {
    test('updates project fields', async () => {
      const updated = { ...sampleProject, name: 'Updated', status: 'completed' };
      mockDb.get.mockImplementationOnce(mockCallback(null, { id: 1 }));
      mockDb.run.mockImplementation(function(q, p, cb) { cb.call(this, null); });
      mockDb.get.mockImplementationOnce(mockCallback(null, updated));

      const res = await request(app).put('/api/projects/1').send({ name: 'Updated', status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.project.name).toBe('Updated');
    });

    test('returns 404 when project not found', async () => {
      mockDb.get.mockImplementation(mockCallback(null, null));
      const res = await request(app).put('/api/projects/999').send({ name: 'X' });
      expect(res.status).toBe(404);
    });

    test('returns 400 for non-numeric ID', async () => {
      const res = await request(app).put('/api/projects/abc').send({ name: 'X' });
      expect(res.status).toBe(400);
    });

    test('rejects invalid status', async () => {
      const res = await request(app).put('/api/projects/1').send({ status: 'bad' });
      expect(res.status).toBe(400);
    });

    test('rejects when updated client not found', async () => {
      mockDb.get
        .mockImplementationOnce(mockCallback(null, { id: 1 }))
        .mockImplementationOnce(mockCallback(null, null));

      const res = await request(app).put('/api/projects/1').send({ clientId: 999 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Client not found/);
    });

    test('handles update error', async () => {
      mockDb.get.mockImplementationOnce(mockCallback(null, { id: 1 }));
      mockDb.run.mockImplementation(mockRunError('update fail'));

      const res = await request(app).put('/api/projects/1').send({ name: 'X' });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    test('deletes project successfully', async () => {
      mockDb.get.mockImplementation(mockCallback(null, { id: 1 }));
      mockDb.run.mockImplementation(function(q, p, cb) { cb.call(this, null); });

      const res = await request(app).delete('/api/projects/1');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Project deleted successfully');
    });

    test('returns 404 when not found', async () => {
      mockDb.get.mockImplementation(mockCallback(null, null));
      const res = await request(app).delete('/api/projects/999');
      expect(res.status).toBe(404);
    });

    test('returns 400 for non-numeric ID', async () => {
      const res = await request(app).delete('/api/projects/abc');
      expect(res.status).toBe(400);
    });

    test('handles delete error', async () => {
      mockDb.get.mockImplementation(mockCallback(null, { id: 1 }));
      mockDb.run.mockImplementation(mockRunError('delete fail'));

      const res = await request(app).delete('/api/projects/1');
      expect(res.status).toBe(500);
    });
  });
});
