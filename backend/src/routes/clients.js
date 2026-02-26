/**
 * @module routes/clients
 * @description Client CRUD route handlers mounted at `/api/clients`.
 *
 * All routes require authentication via the `x-user-email` header. Each user
 * can only access their own clients — queries are always scoped by `user_email`.
 *
 * Endpoints:
 * | Method | Path                | Description                                  |
 * |--------|---------------------|----------------------------------------------|
 * | GET    | `/api/clients`      | List all clients for the authenticated user. |
 * | GET    | `/api/clients/:id`  | Get a single client by ID.                   |
 * | POST   | `/api/clients`      | Create a new client.                         |
 * | PUT    | `/api/clients/:id`  | Partially update an existing client.         |
 * | DELETE | `/api/clients`      | Delete **all** clients for the current user. |
 * | DELETE | `/api/clients/:id`  | Delete a single client (cascades to entries).|
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { clientSchema, updateClientSchema } = require('../validation/schemas');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * GET /api/clients
 *
 * Returns every client record belonging to the authenticated user, ordered
 * alphabetically by name.
 *
 * @route GET /api/clients
 * @group Clients
 * @returns {object} 200 — `{ clients: Client[] }`.
 * @returns {object} 500 — database error.
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
 * Retrieves a single client by its numeric ID. The client must belong to the
 * authenticated user or a 404 is returned.
 *
 * @route GET /api/clients/:id
 * @group Clients
 * @param {string} req.params.id - The client's numeric ID.
 * @returns {object} 200 — `{ client: Client }`.
 * @returns {object} 400 — invalid (non-numeric) client ID.
 * @returns {object} 404 — client not found or does not belong to the user.
 * @returns {object} 500 — database error.
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
 * Creates a new client for the authenticated user. The request body is
 * validated against {@link module:validation/schemas~clientSchema}.
 *
 * @route POST /api/clients
 * @group Clients
 * @param {object} req.body - `{ name, description?, department?, email? }`.
 * @returns {object} 201 — `{ message, client: Client }` with the created record.
 * @returns {object} 400 — Joi validation error.
 * @returns {object} 500 — database error.
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
 * Partially updates an existing client. Only the fields present in the
 * request body are changed; the `updated_at` timestamp is refreshed
 * automatically. Validated against
 * {@link module:validation/schemas~updateClientSchema}.
 *
 * @route PUT /api/clients/:id
 * @group Clients
 * @param {string} req.params.id - The client's numeric ID.
 * @param {object} req.body - One or more of `{ name, description, department, email }`.
 * @returns {object} 200 — `{ message, client: Client }` with the updated record.
 * @returns {object} 400 — invalid ID or Joi validation error.
 * @returns {object} 404 — client not found or does not belong to the user.
 * @returns {object} 500 — database error.
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
 * Deletes **all** clients belonging to the authenticated user. Associated
 * work entries are also removed via the CASCADE foreign-key constraint.
 *
 * @route DELETE /api/clients
 * @group Clients
 * @returns {object} 200 — `{ message, deletedCount }` indicating how many rows were removed.
 * @returns {object} 500 — database error.
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
 * Deletes a single client by ID. The client must belong to the authenticated
 * user. Associated work entries are cascade-deleted by the database.
 *
 * @route DELETE /api/clients/:id
 * @group Clients
 * @param {string} req.params.id - The client's numeric ID.
 * @returns {object} 200 — `{ message: 'Client deleted successfully' }`.
 * @returns {object} 400 — invalid (non-numeric) client ID.
 * @returns {object} 404 — client not found or does not belong to the user.
 * @returns {object} 500 — database error.
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
