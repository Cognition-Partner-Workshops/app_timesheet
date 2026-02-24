/**
 * @module routes/clients
 * @description CRUD routes for managing client entities.
 *
 * All routes in this module require authentication via the
 * {@link module:middleware/auth~authenticateUser} middleware, which is applied
 * at the router level.  Each client is scoped to the authenticated user's
 * email so users can only access their own clients.
 *
 * Endpoints:
 *   GET    /api/clients      - List all clients for the authenticated user.
 *   GET    /api/clients/:id  - Retrieve a single client by ID.
 *   POST   /api/clients      - Create a new client.
 *   PUT    /api/clients/:id  - Partially update an existing client.
 *   DELETE /api/clients      - Delete **all** clients for the authenticated user.
 *   DELETE /api/clients/:id  - Delete a single client by ID (cascades to work entries).
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { clientSchema, updateClientSchema } = require('../validation/schemas');

const router = express.Router();

// All routes in this router require authentication
router.use(authenticateUser);

/**
 * GET /api/clients
 *
 * Returns every client owned by the authenticated user, ordered
 * alphabetically by name.
 *
 * @route   GET /api/clients
 * @returns {Object} 200 - { clients: Array<Client> }
 * @returns {Object} 500 - Internal server error.
 */
router.get('/', (req, res) => {
  const db = getDatabase();
  
  db.all(
    'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE user_email = ? ORDER BY name',
    [req.userEmail],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      res.json({ clients: rows });
    }
  );
});

/**
 * GET /api/clients/:id
 *
 * Returns a single client identified by its numeric ID, provided it belongs
 * to the authenticated user.
 *
 * @route   GET /api/clients/:id
 * @param   {string} req.params.id - Numeric client ID.
 * @returns {Object} 200 - { client: Client }
 * @returns {Object} 400 - Invalid (non-numeric) client ID.
 * @returns {Object} 404 - Client not found or not owned by user.
 * @returns {Object} 500 - Internal server error.
 */
router.get('/:id', (req, res) => {
  const clientId = parseInt(req.params.id);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }
  
  const db = getDatabase();
  
  db.get(
    'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE id = ? AND user_email = ?',
    [clientId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      res.json({ client: row });
    }
  );
});

/**
 * POST /api/clients
 *
 * Creates a new client for the authenticated user.  The request body is
 * validated against {@link module:validation/schemas~clientSchema}.
 *
 * @route   POST /api/clients
 * @param   {Object} req.body
 * @param   {string} req.body.name        - Required client name.
 * @param   {string} [req.body.description] - Optional description.
 * @param   {string} [req.body.department]  - Optional department.
 * @param   {string} [req.body.email]       - Optional contact email.
 * @returns {Object} 201 - { message, client: Client }
 * @returns {Object} 400 - Validation error.
 * @returns {Object} 500 - Internal server error.
 */
router.post('/', (req, res, next) => {
  try {
    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { name, description, department, email } = value;
    const db = getDatabase();

    db.run(
      'INSERT INTO clients (name, description, department, email, user_email) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, department || null, email || null, req.userEmail],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to create client' });
        }

        // Return the created client
        db.get(
          'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE id = ?',
          [this.lastID],
          (err, row) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Client created but failed to retrieve' });
            }

            res.status(201).json({ 
              message: 'Client created successfully',
              client: row 
            });
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/clients/:id
 *
 * Partially updates an existing client.  Only the supplied fields are
 * changed; at least one field must be provided (enforced by
 * {@link module:validation/schemas~updateClientSchema}).  The `updated_at`
 * timestamp is refreshed automatically.
 *
 * @route   PUT /api/clients/:id
 * @param   {string} req.params.id          - Numeric client ID.
 * @param   {Object} req.body               - Fields to update.
 * @param   {string} [req.body.name]        - New client name.
 * @param   {string} [req.body.description] - New description.
 * @param   {string} [req.body.department]  - New department.
 * @param   {string} [req.body.email]       - New contact email.
 * @returns {Object} 200 - { message, client: Client }
 * @returns {Object} 400 - Invalid client ID or validation error.
 * @returns {Object} 404 - Client not found or not owned by user.
 * @returns {Object} 500 - Internal server error.
 */
router.put('/:id', (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const { error, value } = updateClientSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const db = getDatabase();

    // Check if client exists and belongs to user
    db.get(
      'SELECT id FROM clients WHERE id = ? AND user_email = ?',
      [clientId, req.userEmail],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Client not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (value.name !== undefined) {
          updates.push('name = ?');
          values.push(value.name);
        }

        if (value.description !== undefined) {
          updates.push('description = ?');
          values.push(value.description || null);
        }

        if (value.department !== undefined) {
          updates.push('department = ?');
          values.push(value.department || null);
        }

        if (value.email !== undefined) {
          updates.push('email = ?');
          values.push(value.email || null);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(clientId, req.userEmail);

        const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`;

        db.run(query, values, function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update client' });
          }

          // Return updated client
          db.get(
            'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE id = ?',
            [clientId],
            (err, row) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Client updated but failed to retrieve' });
              }

              res.json({
                message: 'Client updated successfully',
                client: row
              });
            }
          );
        });
      }
    );
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/clients
 *
 * Deletes **all** clients belonging to the authenticated user.  Returns
 * the number of deleted records.
 *
 * @route   DELETE /api/clients
 * @returns {Object} 200 - { message, deletedCount: number }
 * @returns {Object} 500 - Internal server error.
 */
router.delete('/', (req, res) => {
  const db = getDatabase();
  
  db.run(
    'DELETE FROM clients WHERE user_email = ?',
    [req.userEmail],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete clients' });
      }
      
      res.json({ 
        message: 'All clients deleted successfully',
        deletedCount: this.changes
      });
    }
  );
});

/**
 * DELETE /api/clients/:id
 *
 * Deletes a single client by ID.  Due to the `ON DELETE CASCADE` foreign
 * key constraint, all associated work entries are removed as well.
 *
 * @route   DELETE /api/clients/:id
 * @param   {string} req.params.id - Numeric client ID.
 * @returns {Object} 200 - { message }
 * @returns {Object} 400 - Invalid (non-numeric) client ID.
 * @returns {Object} 404 - Client not found or not owned by user.
 * @returns {Object} 500 - Internal server error.
 */
router.delete('/:id', (req, res) => {
  const clientId = parseInt(req.params.id);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }
  
  const db = getDatabase();
  
  // Check if client exists and belongs to user
  db.get(
    'SELECT id FROM clients WHERE id = ? AND user_email = ?',
    [clientId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Delete client (work entries will be deleted due to CASCADE)
      db.run(
        'DELETE FROM clients WHERE id = ? AND user_email = ?',
        [clientId, req.userEmail],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to delete client' });
          }
          
          res.json({ message: 'Client deleted successfully' });
        }
      );
    }
  );
});

module.exports = router;
