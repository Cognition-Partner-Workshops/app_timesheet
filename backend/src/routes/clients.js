/**
 * @module routes/clients
 * @description CRUD routes for client management.
 *
 * Mounted at `/api/clients`. All routes are protected by the
 * {@link module:middleware/auth~authenticateUser} middleware and scoped to the
 * authenticated user — a user can only view, create, update, or delete their
 * own client records.
 *
 * @requires express
 * @requires ../database/init
 * @requires ../middleware/auth
 * @requires ../validation/schemas
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
 * Retrieves all clients belonging to the authenticated user, ordered
 * alphabetically by name.
 *
 * @name ListClients
 * @route {GET} /api/clients
 * @returns {object} 200 - `{ clients: Array<Client> }`
 * @returns {object} 500 - Internal server error on database failure.
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
 * Retrieves a single client by ID. The client must belong to the authenticated
 * user; otherwise a 404 is returned.
 *
 * @name GetClient
 * @route {GET} /api/clients/:id
 * @routeparam {number} id - The client's numeric ID.
 * @returns {object} 200 - `{ client: Client }`
 * @returns {object} 400 - Invalid (non-numeric) client ID.
 * @returns {object} 404 - Client not found or not owned by the user.
 * @returns {object} 500 - Internal server error on database failure.
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
 * Creates a new client record for the authenticated user.
 *
 * @name CreateClient
 * @route {POST} /api/clients
 * @bodyparam {string} name        - Client name (required, 1-255 chars).
 * @bodyparam {string} [description] - Optional description (max 1000 chars).
 * @bodyparam {string} [department]  - Optional department (max 255 chars).
 * @bodyparam {string} [email]       - Optional contact email.
 * @returns {object} 201 - `{ message, client: Client }`
 * @returns {object} 400 - Joi validation error.
 * @returns {object} 500 - Internal server error on database failure.
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
 * Updates an existing client. At least one field must be provided in the
 * request body. The client must belong to the authenticated user.
 *
 * @name UpdateClient
 * @route {PUT} /api/clients/:id
 * @routeparam {number} id           - The client's numeric ID.
 * @bodyparam {string} [name]        - Updated client name.
 * @bodyparam {string} [description] - Updated description.
 * @bodyparam {string} [department]  - Updated department.
 * @bodyparam {string} [email]       - Updated contact email.
 * @returns {object} 200 - `{ message, client: Client }`
 * @returns {object} 400 - Invalid client ID or Joi validation error.
 * @returns {object} 404 - Client not found or not owned by the user.
 * @returns {object} 500 - Internal server error on database failure.
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
 * Deletes **all** clients belonging to the authenticated user. Associated work
 * entries are removed automatically via CASCADE foreign-key constraints.
 *
 * @name DeleteAllClients
 * @route {DELETE} /api/clients
 * @returns {object} 200 - `{ message, deletedCount }`
 * @returns {object} 500 - Internal server error on database failure.
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
 * user. Associated work entries are removed automatically via CASCADE
 * foreign-key constraints.
 *
 * @name DeleteClient
 * @route {DELETE} /api/clients/:id
 * @routeparam {number} id - The client's numeric ID.
 * @returns {object} 200 - `{ message }`
 * @returns {object} 400 - Invalid (non-numeric) client ID.
 * @returns {object} 404 - Client not found or not owned by the user.
 * @returns {object} 500 - Internal server error on database failure.
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
