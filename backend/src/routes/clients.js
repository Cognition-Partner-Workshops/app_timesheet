const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { clientSchema, updateClientSchema } = require('../validation/schemas');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Get all clients for authenticated user
router.get('/', async (req, res) => {
  try {
    const pool = getDatabase();

    const { rows } = await pool.query(
      'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE user_email = $1 ORDER BY name',
      [req.userEmail]
    );

    res.json({ clients: rows });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific client
router.get('/:id', async (req, res) => {
  const clientId = parseInt(req.params.id);

  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }

  try {
    const pool = getDatabase();

    const { rows } = await pool.query(
      'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE id = $1 AND user_email = $2',
      [clientId, req.userEmail]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client: rows[0] });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new client
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { name, description, department, email } = value;
    const pool = getDatabase();

    const { rows } = await pool.query(
      'INSERT INTO clients (name, description, department, email, user_email) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, department, email, created_at, updated_at',
      [name, description || null, department || null, email || null, req.userEmail]
    );

    res.status(201).json({
      message: 'Client created successfully',
      client: rows[0]
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.put('/:id', async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const { error, value } = updateClientSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const pool = getDatabase();

    // Check if client exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND user_email = $2',
      [clientId, req.userEmail]
    );

    if (!checkResult.rows[0]) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (value.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(value.name);
    }

    if (value.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(value.description || null);
    }

    if (value.department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      values.push(value.department || null);
    }

    if (value.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(value.email || null);
    }

    updates.push('updated_at = NOW()');
    values.push(clientId, req.userEmail);

    const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_email = $${paramIndex} RETURNING id, name, description, department, email, created_at, updated_at`;

    const { rows } = await pool.query(query, values);

    res.json({
      message: 'Client updated successfully',
      client: rows[0]
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete all clients for authenticated user
router.delete('/', async (req, res) => {
  try {
    const pool = getDatabase();

    const result = await pool.query(
      'DELETE FROM clients WHERE user_email = $1',
      [req.userEmail]
    );

    res.json({
      message: 'All clients deleted successfully',
      deletedCount: result.rowCount
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete clients' });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  const clientId = parseInt(req.params.id);

  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }

  try {
    const pool = getDatabase();

    // Check if client exists and belongs to user
    const { rows } = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND user_email = $2',
      [clientId, req.userEmail]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Delete client (work entries will be deleted due to CASCADE)
    await pool.query(
      'DELETE FROM clients WHERE id = $1 AND user_email = $2',
      [clientId, req.userEmail]
    );

    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
