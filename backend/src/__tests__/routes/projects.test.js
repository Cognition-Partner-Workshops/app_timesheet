const request = require('supertest');
const {
  createTestApp, createMockDb, mockDbRun, mockDbRunError,
  mockDbGetResult, mockDbGetError, mockDbGetSequence
} = require('../helpers/crudTestFactory');

const projectRoutes = require('../../routes/projects');

const app = createTestApp('/api/projects', projectRoutes);

const sampleProject = {
  id: 1, name: 'Project A', description: 'Desc A', client_id: 1,
  start_date: '2024-01-01', status: 'active', client_name: 'Client A',
  created_at: '2024-01-01', updated_at: '2024-01-01'
};

describe('Project Routes', () => {
  let mockDb;

  beforeEach(() => { mockDb = createMockDb(); });
  afterEach(() => { jest.clearAllMocks(); });

  describe('GET /api/projects', () => {
    test('should return all projects for authenticated user', async () => {
      const projects = [sampleProject, { ...sampleProject, id: 2, name: 'Project B', status: 'on-hold', client_name: null }];
      mockDb.all.mockImplementation((q, p, cb) => cb(null, projects));

      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ projects });
      expect(mockDb.all).toHaveBeenCalledWith(expect.stringContaining('SELECT p.id'), ['test@example.com'], expect.any(Function));
    });

    test('should return empty array when no projects exist', async () => {
      mockDb.all.mockImplementation((q, p, cb) => cb(null, []));
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ projects: [] });
    });

    test('should handle database error', async () => {
      mockDb.all.mockImplementation((q, p, cb) => cb(new Error('Database error'), null));
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/projects/:id', () => {
    test('should return specific project', async () => {
      mockDbGetResult(mockDb, sampleProject);
      const res = await request(app).get('/api/projects/1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ project: sampleProject });
    });

    test('should return 404 if not found', async () => {
      mockDbGetResult(mockDb, null);
      const res = await request(app).get('/api/projects/999');
      expect(res.status).toBe(404);
    });

    test('should return 400 for invalid ID', async () => {
      const res = await request(app).get('/api/projects/invalid');
      expect(res.status).toBe(400);
    });

    test('should handle database error', async () => {
      mockDbGetError(mockDb);
      const res = await request(app).get('/api/projects/1');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/projects', () => {
    test('should create project with valid data', async () => {
      mockDbRun(mockDb);
      mockDbGetResult(mockDb, sampleProject);

      const res = await request(app).post('/api/projects').send({ name: 'Project A', description: 'Desc A' });
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Project created successfully');
      expect(res.body.project).toEqual(sampleProject);
    });

    test('should create project with all fields including clientId and startDate', async () => {
      const fullProject = { ...sampleProject, id: 2, status: 'on-hold' };
      mockDbRun(mockDb, 2);
      mockDbGetResult(mockDb, fullProject);

      const res = await request(app).post('/api/projects')
        .send({ name: 'Full', description: 'Desc', clientId: 1, startDate: '2024-06-01', status: 'on-hold' });
      expect(res.status).toBe(201);
    });

    test('should return 400 for missing name', async () => {
      const res = await request(app).post('/api/projects').send({ description: 'No name' });
      expect(res.status).toBe(400);
    });

    test('should return 400 for invalid status', async () => {
      const res = await request(app).post('/api/projects').send({ name: 'Test', status: 'bad' });
      expect(res.status).toBe(400);
    });

    test('should handle insert error', async () => {
      mockDbRunError(mockDb);
      const res = await request(app).post('/api/projects').send({ name: 'Test' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create project');
    });

    test('should handle retrieve error after insert', async () => {
      mockDbRun(mockDb);
      mockDbGetError(mockDb);
      const res = await request(app).post('/api/projects').send({ name: 'Test' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Project created but failed to retrieve');
    });
  });

  describe('PUT /api/projects/:id', () => {
    test('should update project', async () => {
      const updated = { ...sampleProject, name: 'Updated', status: 'completed' };
      mockDbGetSequence(mockDb, [{ id: 1 }, updated]);
      mockDbRun(mockDb);

      const res = await request(app).put('/api/projects/1').send({ name: 'Updated', status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Project updated successfully');
    });

    test('should return 404 if not found', async () => {
      mockDbGetResult(mockDb, null);
      const res = await request(app).put('/api/projects/999').send({ name: 'Updated' });
      expect(res.status).toBe(404);
    });

    test('should return 400 for invalid ID', async () => {
      const res = await request(app).put('/api/projects/invalid').send({ name: 'X' });
      expect(res.status).toBe(400);
    });

    test('should return 400 when no fields provided', async () => {
      const res = await request(app).put('/api/projects/1').send({});
      expect(res.status).toBe(400);
    });

    test('should return 400 for invalid status', async () => {
      const res = await request(app).put('/api/projects/1').send({ status: 'bad' });
      expect(res.status).toBe(400);
    });

    test('should handle existence check db error', async () => {
      mockDbGetError(mockDb);
      const res = await request(app).put('/api/projects/1').send({ name: 'X' });
      expect(res.status).toBe(500);
    });

    test('should handle update db error', async () => {
      mockDbGetSequence(mockDb, [{ id: 1 }]);
      mockDbRunError(mockDb);
      const res = await request(app).put('/api/projects/1').send({ name: 'X' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update project');
    });

    test('should handle retrieve error after update', async () => {
      mockDbGetSequence(mockDb, [{ id: 1 }, new Error('Database error')]);
      mockDbRun(mockDb);
      const res = await request(app).put('/api/projects/1').send({ name: 'X' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Project updated but failed to retrieve');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    test('should delete project', async () => {
      mockDbGetResult(mockDb, { id: 1 });
      mockDbRun(mockDb);
      const res = await request(app).delete('/api/projects/1');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Project deleted successfully');
    });

    test('should return 404 if not found', async () => {
      mockDbGetResult(mockDb, null);
      const res = await request(app).delete('/api/projects/999');
      expect(res.status).toBe(404);
    });

    test('should return 400 for invalid ID', async () => {
      const res = await request(app).delete('/api/projects/invalid');
      expect(res.status).toBe(400);
    });

    test('should handle existence check db error', async () => {
      mockDbGetError(mockDb);
      const res = await request(app).delete('/api/projects/1');
      expect(res.status).toBe(500);
    });

    test('should handle delete db error', async () => {
      mockDbGetResult(mockDb, { id: 1 });
      mockDbRunError(mockDb);
      const res = await request(app).delete('/api/projects/1');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete project');
    });
  });
});
