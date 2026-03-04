/**
 * @module routes/clients
 * @description Client CRUD route handlers.
 *
 * All routes require authentication via the `x-user-email` header. Clients
 * are scoped to the authenticated user -- a user can only see, create, update,
 * and delete their own clients.
 *
 * **Endpoints:**
 *
 * | Method | Path                 | Description                       |
 * |--------|----------------------|-----------------------------------|
 * | GET    | `/api/clients`       | List all clients for the user     |
 * | GET    | `/api/clients/:id`   | Get a single client by ID         |
 * | POST   | `/api/clients`       | Create a new client               |
 * | PUT    | `/api/clients/:id`   | Update an existing client         |
 * | DELETE | `/api/clients`       | Delete all clients for the user   |
 * | DELETE | `/api/clients/:id`   | Delete a single client by ID      |
 *
 * **Common response shapes:**
 * - Success list: `{ clients: [ { id, name, description, department, email, created_at, updated_at } ] }`
 * - Success single: `{ client: { id, name, description, department, email, created_at, updated_at } }`
 * - Error: `{ error: string }`
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
 * Returns all clients belonging to the authenticated user, ordered
 * alphabetically by name.
 *
 * @name GetClients
 * @route {GET} /api/clients
 * @returns {object} 200 - `{ clients: ClientRow[] }`
 * @returns {object} 500 - Database error.
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
 * Returns a single client by its ID, provided it belongs to the
 * authenticated user.
 *
 * @name GetClientById
 * @route {GET} /api/clients/:id
 * @routeparam {number} id - Client ID (integer).
 * @returns {object} 200 - `{ client: ClientRow }`
 * @returns {object} 400 - Invalid client ID.
 * @returns {object} 404 - Client not found or not owned by user.
 * @returns {object} 500 - Database error.
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
 * validated against {@link module:validation/schemas.clientSchema}.
 *
 * @name CreateClient
 * @route {POST} /api/clients
 * @bodyparam {string} name - Client name (required, 1-255 chars).
 * @bodyparam {string} [description] - Optional description (max 1000 chars).
 * @bodyparam {string} [department] - Optional department (max 255 chars).
 * @bodyparam {string} [email] - Optional contact email.
 * @returns {object} 201 - `{ message, client: ClientRow }`
 * @returns {object} 400 - Validation error.
 * @returns {object} 500 - Database error.
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
 * Partially updates an existing client. At least one field must be provided.
 * The request body is validated against
 * {@link module:validation/schemas.updateClientSchema}.
 *
 * @name UpdateClient
 * @route {PUT} /api/clients/:id
 * @routeparam {number} id - Client ID (integer).
 * @bodyparam {string} [name] - Updated name.
 * @bodyparam {string} [description] - Updated description.
 * @bodyparam {string} [department] - Updated department.
 * @bodyparam {string} [email] - Updated contact email.
 * @returns {object} 200 - `{ message, client: ClientRow }`
 * @returns {object} 400 - Invalid ID or validation error.
 * @returns {object} 404 - Client not found or not owned by user.
 * @returns {object} 500 - Database error.
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
 * work entries are removed automatically via CASCADE foreign-key constraints.
 *
 * @name DeleteAllClients
 * @route {DELETE} /api/clients
 * @returns {object} 200 - `{ message, deletedCount: number }`
 * @returns {object} 500 - Database error.
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
 * Deletes a single client by ID. Associated work entries are removed
 * automatically via CASCADE foreign-key constraints.
 *
 * @name DeleteClient
 * @route {DELETE} /api/clients/:id
 * @routeparam {number} id - Client ID (integer).
 * @returns {object} 200 - `{ message: "Client deleted successfully" }`
 * @returns {object} 400 - Invalid client ID.
 * @returns {object} 404 - Client not found or not owned by user.
 * @returns {object} 500 - Database error.
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
