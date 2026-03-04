const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { workEntrySchema, updateWorkEntrySchema } = require('../validation/schemas');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Get all work entries for authenticated user (with optional client filter)
router.get('/', async (req, res) => {
  const { clientId } = req.query;

  let query = `
    SELECT we.id, we.client_id, we.hours, we.description, we.date, 
           we.created_at, we.updated_at, c.name as client_name
    FROM work_entries we
    JOIN clients c ON we.client_id = c.id
    WHERE we.user_email = $1
  `;

  const params = [req.userEmail];
  let paramIndex = 2;

  if (clientId) {
    const clientIdNum = parseInt(clientId);
    if (isNaN(clientIdNum)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    query += ` AND we.client_id = $${paramIndex}`;
    params.push(clientIdNum);
  }

  query += ' ORDER BY we.date DESC, we.created_at DESC';

  try {
    const pool = getDatabase();
    const { rows } = await pool.query(query, params);
    res.json({ workEntries: rows });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific work entry
router.get('/:id', async (req, res) => {
  const workEntryId = parseInt(req.params.id);

  if (isNaN(workEntryId)) {
    return res.status(400).json({ error: 'Invalid work entry ID' });
  }

  try {
    const pool = getDatabase();

    const { rows } = await pool.query(
      `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
              we.created_at, we.updated_at, c.name as client_name
       FROM work_entries we
       JOIN clients c ON we.client_id = c.id
       WHERE we.id = $1 AND we.user_email = $2`,
      [workEntryId, req.userEmail]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Work entry not found' });
    }

    res.json({ workEntry: rows[0] });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new work entry
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = workEntrySchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { clientId, hours, description, date } = value;
    const pool = getDatabase();

    // Verify client exists and belongs to user
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND user_email = $2',
      [clientId, req.userEmail]
    );

    if (!clientCheck.rows[0]) {
      return res.status(400).json({ error: 'Client not found or does not belong to user' });
    }

    // Create work entry and return it with client name via a subquery
    const insertResult = await pool.query(
      'INSERT INTO work_entries (client_id, user_email, hours, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [clientId, req.userEmail, hours, description || null, date]
    );

    const newEntryId = insertResult.rows[0].id;

    const { rows } = await pool.query(
      `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
              we.created_at, we.updated_at, c.name as client_name
       FROM work_entries we
       JOIN clients c ON we.client_id = c.id
       WHERE we.id = $1`,
      [newEntryId]
    );

    res.status(201).json({
      message: 'Work entry created successfully',
      workEntry: rows[0]
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create work entry' });
  }
});

// Update work entry
router.put('/:id', async (req, res, next) => {
  try {
    const workEntryId = parseInt(req.params.id);

    if (isNaN(workEntryId)) {
      return res.status(400).json({ error: 'Invalid work entry ID' });
    }

    const { error, value } = updateWorkEntrySchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const pool = getDatabase();

    // Check if work entry exists and belongs to user
    const entryCheck = await pool.query(
      'SELECT id FROM work_entries WHERE id = $1 AND user_email = $2',
      [workEntryId, req.userEmail]
    );

    if (!entryCheck.rows[0]) {
      return res.status(404).json({ error: 'Work entry not found' });
    }

    // If clientId is being updated, verify it belongs to user
    if (value.clientId) {
      const clientCheck = await pool.query(
        'SELECT id FROM clients WHERE id = $1 AND user_email = $2',
        [value.clientId, req.userEmail]
      );

      if (!clientCheck.rows[0]) {
        return res.status(400).json({ error: 'Client not found or does not belong to user' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (value.clientId !== undefined) {
      updates.push(`client_id = $${paramIndex++}`);
      values.push(value.clientId);
    }

    if (value.hours !== undefined) {
      updates.push(`hours = $${paramIndex++}`);
      values.push(value.hours);
    }

    if (value.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(value.description || null);
    }

    if (value.date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(value.date);
    }

    updates.push('updated_at = NOW()');
    values.push(workEntryId, req.userEmail);

    const query = `UPDATE work_entries SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_email = $${paramIndex}`;

    await pool.query(query, values);

    // Return updated work entry with client name
    const { rows } = await pool.query(
      `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
              we.created_at, we.updated_at, c.name as client_name
       FROM work_entries we
       JOIN clients c ON we.client_id = c.id
       WHERE we.id = $1`,
      [workEntryId]
    );

    res.json({
      message: 'Work entry updated successfully',
      workEntry: rows[0]
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update work entry' });
  }
});

// Delete work entry
router.delete('/:id', async (req, res) => {
  const workEntryId = parseInt(req.params.id);

  if (isNaN(workEntryId)) {
    return res.status(400).json({ error: 'Invalid work entry ID' });
  }

  try {
    const pool = getDatabase();

    // Check if work entry exists and belongs to user
    const { rows } = await pool.query(
      'SELECT id FROM work_entries WHERE id = $1 AND user_email = $2',
      [workEntryId, req.userEmail]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Work entry not found' });
    }

    // Delete work entry
    await pool.query(
      'DELETE FROM work_entries WHERE id = $1 AND user_email = $2',
      [workEntryId, req.userEmail]
    );

    res.json({ message: 'Work entry deleted successfully' });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete work entry' });
  }
});

module.exports = router;
