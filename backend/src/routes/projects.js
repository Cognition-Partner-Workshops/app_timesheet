const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { projectSchema, updateProjectSchema } = require('../validation/schemas');
const { parseId, dbError, checkOwnership, buildUpdateQuery } = require('../utils/routeHelpers');

const router = express.Router();

router.use(authenticateUser);

const PROJECT_SELECT = `SELECT p.id, p.name, p.description, p.client_id, p.start_date, p.status,
  p.created_at, p.updated_at, c.name as client_name
  FROM projects p LEFT JOIN clients c ON p.client_id = c.id`;

const PROJECT_FIELDS = {
  name: 'name',
  description: 'description',
  clientId: 'client_id',
  startDate: 'start_date',
  status: 'status'
};

router.get('/', (req, res) => {
  const db = getDatabase();
  db.all(`${PROJECT_SELECT} WHERE p.user_email = ? ORDER BY p.name`, [req.userEmail], (err, rows) => {
    if (err) return dbError(res)(err);
    res.json({ projects: rows });
  });
});

router.get('/:id', (req, res) => {
  const projectId = parseId(req, res, 'project');
  if (!projectId) return;

  const db = getDatabase();
  db.get(`${PROJECT_SELECT} WHERE p.id = ? AND p.user_email = ?`, [projectId, req.userEmail], (err, row) => {
    if (err) return dbError(res)(err);
    if (!row) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: row });
  });
});

router.post('/', (req, res, next) => {
  try {
    const { error, value } = projectSchema.validate(req.body);
    if (error) return next(error);

    const { name, description, clientId, startDate, status } = value;
    const db = getDatabase();

    db.run(
      'INSERT INTO projects (name, description, client_id, start_date, status, user_email) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || null, clientId || null, startDate || null, status, req.userEmail],
      function(err) {
        if (err) return dbError(res, 'Failed to create project')(err);
        db.get(`${PROJECT_SELECT} WHERE p.id = ?`, [this.lastID], (err, row) => {
          if (err) return dbError(res, 'Project created but failed to retrieve')(err);
          res.status(201).json({ message: 'Project created successfully', project: row });
        });
      }
    );
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const projectId = parseId(req, res, 'project');
    if (!projectId) return;

    const { error, value } = updateProjectSchema.validate(req.body);
    if (error) return next(error);

    const db = getDatabase();

    checkOwnership(db, 'projects', projectId, req.userEmail, (err, row) => {
      if (err) return dbError(res)(err);
      if (!row) return res.status(404).json({ error: 'Project not found' });

      const { updates, values } = buildUpdateQuery('projects', PROJECT_FIELDS, value);
      values.push(projectId, req.userEmail);

      db.run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`, values, function(err) {
        if (err) return dbError(res, 'Failed to update project')(err);
        db.get(`${PROJECT_SELECT} WHERE p.id = ?`, [projectId], (err, row) => {
          if (err) return dbError(res, 'Project updated but failed to retrieve')(err);
          res.json({ message: 'Project updated successfully', project: row });
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res) => {
  const projectId = parseId(req, res, 'project');
  if (!projectId) return;

  const db = getDatabase();

  checkOwnership(db, 'projects', projectId, req.userEmail, (err, row) => {
    if (err) return dbError(res)(err);
    if (!row) return res.status(404).json({ error: 'Project not found' });

    db.run('DELETE FROM projects WHERE id = ? AND user_email = ?', [projectId, req.userEmail], function(err) {
      if (err) return dbError(res, 'Failed to delete project')(err);
      res.json({ message: 'Project deleted successfully' });
    });
  });
});

module.exports = router;
