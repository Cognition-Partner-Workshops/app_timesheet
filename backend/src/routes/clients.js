/**
 * @module routes/clients
 * @description Client management route handlers.
 *
 * Mounted at `/api/clients`. All routes require the `x-user-email` header
 * (enforced by the {@link module:middleware/auth~authenticateUser} middleware
 * applied at router level). Clients are scoped to the authenticated user —
 * users can only see and modify their own clients.
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
 * Returns every client belonging to the authenticated user, ordered
 * alphabetically by name.
 *
 * Success response (200):
 * ```json
 * {
 *   "clients": [
 *     { "id": 1, "name": "Acme Corp", "description": "...", "department": "...",
 *       "email": "contact@acme.com", "created_at": "...", "updated_at": "..." }
 *   ]
 * }
 * ```
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
 * Returns a single client by ID. The client must belong to the
 * authenticated user.
 *
 * Path params:
 *  - `id` (integer) — client ID.
 *
 * Success response (200):
 * ```json
 * { "client": { "id": 1, "name": "Acme Corp", ... } }
 * ```
 *
 * Error responses:
 *  - `400` — invalid (non-numeric) ID.
 *  - `404` — client not found or not owned by the user.
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
 * Creates a new client for the authenticated user.
 *
 * Request body — validated by {@link module:validation/schemas~clientSchema}:
 * ```json
 * { "name": "Acme Corp", "description": "Consulting", "department": "IT", "email": "a@acme.com" }
 * ```
 *
 * Success response (201):
 * ```json
 * { "message": "Client created successfully", "client": { ... } }
 * ```
 *
 * Error responses:
 *  - `400` — validation error.
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
 * Partially updates a client. Only the supplied fields are changed;
 * omitted fields remain as-is. The `updated_at` timestamp is refreshed
 * automatically.
 *
 * Path params:
 *  - `id` (integer) — client ID.
 *
 * Request body — validated by {@link module:validation/schemas~updateClientSchema}:
 * ```json
 * { "name": "Acme Corp Updated" }
 * ```
 *
 * Success response (200):
 * ```json
 * { "message": "Client updated successfully", "client": { ... } }
 * ```
 *
 * Error responses:
 *  - `400` — invalid ID or validation error.
 *  - `404` — client not found or not owned by the user.
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
 * Deletes **all** clients belonging to the authenticated user.
 * Associated work entries are removed via the CASCADE foreign-key
 * constraint.
 *
 * Success response (200):
 * ```json
 * { "message": "All clients deleted successfully", "deletedCount": 3 }
 * ```
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
 * Deletes a single client. Associated work entries are removed via the
 * CASCADE foreign-key constraint.
 *
 * Path params:
 *  - `id` (integer) — client ID.
 *
 * Success response (200):
 * ```json
 * { "message": "Client deleted successfully" }
 * ```
 *
 * Error responses:
 *  - `400` — invalid (non-numeric) ID.
 *  - `404` — client not found or not owned by the user.
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
