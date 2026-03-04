/**
 * @module routes/workEntries
 * @description CRUD route handlers for time-tracking work entries.
 *
 * All endpoints require authentication via the
 * {@link module:middleware/auth~authenticateUser} middleware. Every query is
 * scoped to the authenticated user's email to enforce data isolation.
 *
 * Endpoints:
 * - `GET    /api/work-entries`     - List work entries (optionally filtered by client).
 * - `GET    /api/work-entries/:id` - Retrieve a single work entry.
 * - `POST   /api/work-entries`     - Create a new work entry.
 * - `PUT    /api/work-entries/:id` - Update an existing work entry.
 * - `DELETE /api/work-entries/:id` - Delete a work entry.
 *
 * Work entries are always joined with the `clients` table so the response
 * includes the `client_name` alongside each entry.
 *
 * @see module:validation/schemas
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { workEntrySchema, updateWorkEntrySchema } = require('../validation/schemas');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * GET /api/work-entries
 *
 * Returns all work entries for the authenticated user, sorted by date
 * descending. An optional `clientId` query parameter narrows results to a
 * single client.
 *
 * @route GET /api/work-entries
 * @param {string} [req.query.clientId] - Optional numeric client ID to filter by.
 * @returns {Object} 200 - `{ workEntries: Array<{ id, client_id, hours, description, date, created_at, updated_at, client_name }> }`
 * @returns {Object} 400 - Invalid (non-numeric) client ID query parameter.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.get('/', (req, res) => {
  const { clientId } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT we.id, we.client_id, we.hours, we.description, we.date, 
           we.created_at, we.updated_at, c.name as client_name
    FROM work_entries we
    JOIN clients c ON we.client_id = c.id
    WHERE we.user_email = ?
  `;
  
  const params = [req.userEmail];
  
  if (clientId) {
    const clientIdNum = parseInt(clientId);
    if (isNaN(clientIdNum)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    query += ' AND we.client_id = ?';
    params.push(clientIdNum);
  }
  
  query += ' ORDER BY we.date DESC, we.created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json({ workEntries: rows });
  });
});

/**
 * GET /api/work-entries/:id
 *
 * Retrieves a single work entry by its numeric ID, provided it belongs to
 * the authenticated user.
 *
 * @route GET /api/work-entries/:id
 * @param {string} req.params.id - The work entry's numeric ID.
 * @returns {Object} 200 - `{ workEntry: { id, client_id, hours, description, date, created_at, updated_at, client_name } }`
 * @returns {Object} 400 - Invalid (non-numeric) work entry ID.
 * @returns {Object} 404 - Work entry not found or not owned by the user.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.get('/:id', (req, res) => {
  const workEntryId = parseInt(req.params.id);
  
  if (isNaN(workEntryId)) {
    return res.status(400).json({ error: 'Invalid work entry ID' });
  }
  
  const db = getDatabase();
  
  db.get(
    `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
            we.created_at, we.updated_at, c.name as client_name
     FROM work_entries we
     JOIN clients c ON we.client_id = c.id
     WHERE we.id = ? AND we.user_email = ?`,
    [workEntryId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Work entry not found' });
      }
      
      res.json({ workEntry: row });
    }
  );
});

/**
 * POST /api/work-entries
 *
 * Creates a new work entry for the authenticated user. The referenced client
 * must exist and belong to the user. Validated against
 * {@link module:validation/schemas~workEntrySchema}.
 *
 * @route POST /api/work-entries
 * @param {Object}  req.body
 * @param {number}  req.body.clientId    - ID of the client this entry is for (required).
 * @param {number}  req.body.hours       - Hours worked, 0-24 with up to 2 decimal places (required).
 * @param {string}  [req.body.description] - Optional description of the work performed.
 * @param {string}  req.body.date        - ISO 8601 date string (required).
 * @returns {Object} 201 - `{ message, workEntry }` with the newly created record.
 * @returns {Object} 400 - Validation error or client not found / not owned.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.post('/', (req, res, next) => {
  try {
    const { error, value } = workEntrySchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { clientId, hours, description, date } = value;
    const db = getDatabase();

    // Verify client exists and belongs to user
    db.get(
      'SELECT id FROM clients WHERE id = ? AND user_email = ?',
      [clientId, req.userEmail],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
          return res.status(400).json({ error: 'Client not found or does not belong to user' });
        }

        // Create work entry
        db.run(
          'INSERT INTO work_entries (client_id, user_email, hours, description, date) VALUES (?, ?, ?, ?, ?)',
          [clientId, req.userEmail, hours, description || null, date],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to create work entry' });
            }

            // Return the created work entry with client name
            db.get(
              `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
                      we.created_at, we.updated_at, c.name as client_name
               FROM work_entries we
               JOIN clients c ON we.client_id = c.id
               WHERE we.id = ?`,
              [this.lastID],
              (err, row) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Work entry created but failed to retrieve' });
                }

                res.status(201).json({
                  message: 'Work entry created successfully',
                  workEntry: row
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/work-entries/:id
 *
 * Updates an existing work entry. Only the fields provided in the request body
 * are modified; omitted fields remain unchanged. At least one field must be
 * supplied. If `clientId` is updated, the new client must belong to the user.
 * Validated against {@link module:validation/schemas~updateWorkEntrySchema}.
 *
 * @route PUT /api/work-entries/:id
 * @param {string}  req.params.id            - The work entry's numeric ID.
 * @param {Object}  req.body                 - Fields to update (at least one required).
 * @param {number}  [req.body.clientId]      - Updated client ID.
 * @param {number}  [req.body.hours]         - Updated hours worked.
 * @param {string}  [req.body.description]   - Updated description.
 * @param {string}  [req.body.date]          - Updated ISO 8601 date.
 * @returns {Object} 200 - `{ message, workEntry }` with the updated record.
 * @returns {Object} 400 - Invalid work entry ID, Joi validation error, or client not owned.
 * @returns {Object} 404 - Work entry not found or not owned by the user.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.put('/:id', (req, res, next) => {
  try {
    const workEntryId = parseInt(req.params.id);
    
    if (isNaN(workEntryId)) {
      return res.status(400).json({ error: 'Invalid work entry ID' });
    }

    const { error, value } = updateWorkEntrySchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const db = getDatabase();

    // Check if work entry exists and belongs to user
    db.get(
      'SELECT id FROM work_entries WHERE id = ? AND user_email = ?',
      [workEntryId, req.userEmail],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Work entry not found' });
        }

        // If clientId is being updated, verify it belongs to user
        if (value.clientId) {
          db.get(
            'SELECT id FROM clients WHERE id = ? AND user_email = ?',
            [value.clientId, req.userEmail],
            (err, clientRow) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
              }

              if (!clientRow) {
                return res.status(400).json({ error: 'Client not found or does not belong to user' });
              }

              performUpdate();
            }
          );
        } else {
          performUpdate();
        }

        function performUpdate() {
          // Build update query dynamically
          const updates = [];
          const values = [];

          if (value.clientId !== undefined) {
            updates.push('client_id = ?');
            values.push(value.clientId);
          }

          if (value.hours !== undefined) {
            updates.push('hours = ?');
            values.push(value.hours);
          }

          if (value.description !== undefined) {
            updates.push('description = ?');
            values.push(value.description || null);
          }

          if (value.date !== undefined) {
            updates.push('date = ?');
            values.push(value.date);
          }

          updates.push('updated_at = CURRENT_TIMESTAMP');
          values.push(workEntryId, req.userEmail);

          const query = `UPDATE work_entries SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`;

          db.run(query, values, function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to update work entry' });
            }

            // Return updated work entry with client name
            db.get(
              `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
                      we.created_at, we.updated_at, c.name as client_name
               FROM work_entries we
               JOIN clients c ON we.client_id = c.id
               WHERE we.id = ?`,
              [workEntryId],
              (err, row) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Work entry updated but failed to retrieve' });
                }

                res.json({
                  message: 'Work entry updated successfully',
                  workEntry: row
                });
              }
            );
          });
        }
      }
    );
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/work-entries/:id
 *
 * Deletes a single work entry by its numeric ID, provided it belongs to the
 * authenticated user.
 *
 * @route DELETE /api/work-entries/:id
 * @param {string} req.params.id - The work entry's numeric ID.
 * @returns {Object} 200 - `{ message }` confirming deletion.
 * @returns {Object} 400 - Invalid (non-numeric) work entry ID.
 * @returns {Object} 404 - Work entry not found or not owned by the user.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.delete('/:id', (req, res) => {
  const workEntryId = parseInt(req.params.id);
  
  if (isNaN(workEntryId)) {
    return res.status(400).json({ error: 'Invalid work entry ID' });
  }
  
  const db = getDatabase();
  
  // Check if work entry exists and belongs to user
  db.get(
    'SELECT id FROM work_entries WHERE id = ? AND user_email = ?',
    [workEntryId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Work entry not found' });
      }
      
      // Delete work entry
      db.run(
        'DELETE FROM work_entries WHERE id = ? AND user_email = ?',
        [workEntryId, req.userEmail],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to delete work entry' });
          }
          
          res.json({ message: 'Work entry deleted successfully' });
        }
      );
    }
  );
});

module.exports = router;
