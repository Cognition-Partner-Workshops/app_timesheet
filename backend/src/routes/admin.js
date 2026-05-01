const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { execFile } = require('child_process');
const path = require('path');

const router = express.Router();

// Search users by email
router.get('/users/search', authenticateUser, (req, res) => {
  const db = getDatabase();
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  db.all('SELECT email, created_at FROM users WHERE email LIKE ?', [`%${query}%`], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ users: rows });
  });
});

// Get system diagnostics
router.get('/system/diagnostics', authenticateUser, (req, res) => {
  const target = req.query.target;

  if (!target || !/^[a-zA-Z0-9._-]+$/.test(target)) {
    return res.status(400).json({ error: 'Invalid target' });
  }

  execFile('ping', ['-c', '1', target], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Diagnostics failed' });
    }
    res.json({ output: stdout });
  });
});

// Dynamic query builder for custom reports
router.post('/reports/custom', authenticateUser, (req, res) => {
  const { field, operator, value } = req.body;

  const allowedFields = ['client_id', 'hours', 'date', 'description', 'user_email'];
  const allowedOperators = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains'];

  if (!field || !allowedFields.includes(field) || !allowedOperators.includes(operator)) {
    return res.status(400).json({ error: 'Invalid filter parameters' });
  }

  const db = getDatabase();
  db.all('SELECT * FROM work_entries', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    const filtered = rows.filter((row) => {
      const rowVal = row[field];
      switch (operator) {
        case 'eq': return rowVal == value;
        case 'neq': return rowVal != value;
        case 'gt': return rowVal > value;
        case 'lt': return rowVal < value;
        case 'gte': return rowVal >= value;
        case 'lte': return rowVal <= value;
        case 'contains': return String(rowVal).includes(String(value));
        default: return true;
      }
    });
    res.json({ results: filtered });
  });
});

// Download report file
router.get('/reports/download', authenticateUser, (req, res) => {
  const filename = req.query.file;

  if (!filename || /[\/\\]/.test(filename) || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const baseDir = path.resolve('/tmp/reports');
  const filePath = path.resolve(baseDir, filename);

  if (!filePath.startsWith(baseDir + path.sep)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  res.sendFile(filePath);
});

module.exports = router;
