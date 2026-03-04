/**
 * @module routes/workEntries
 * @description Work-entry CRUD route handlers.
 *
 * All routes require authentication via the `x-user-email` header. Work
 * entries are scoped to the authenticated user and linked to a client that
 * also belongs to that user.
 *
 * **Endpoints:**
 *
 * | Method | Path                     | Description                              |
 * |--------|--------------------------|------------------------------------------|
 * | GET    | `/api/work-entries`      | List entries (optional `?clientId=` filter) |
 * | GET    | `/api/work-entries/:id`  | Get a single entry by ID                 |
 * | POST   | `/api/work-entries`      | Create a new entry                       |
 * | PUT    | `/api/work-entries/:id`  | Update an existing entry                 |
 * | DELETE | `/api/work-entries/:id`  | Delete an entry                          |
 *
 * **Common response shapes:**
 * - Success list: `{ workEntries: [ { id, client_id, hours, description, date, created_at, updated_at, client_name } ] }`
 * - Success single: `{ workEntry: { id, client_id, hours, description, date, created_at, updated_at, client_name } }`
 * - Error: `{ error: string }`
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
 * Returns all work entries for the authenticated user, ordered by date
 * descending. Optionally filters by `clientId` query parameter.
 *
 * @name GetWorkEntries
 * @route {GET} /api/work-entries
 * @queryparam {number} [clientId] - Optional client ID to filter entries.
 * @returns {object} 200 - `{ workEntries: WorkEntryRow[] }`
 * @returns {object} 400 - Invalid clientId query parameter.
 * @returns {object} 500 - Database error.
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
 * Returns a single work entry by its ID, provided it belongs to the
 * authenticated user. Includes the joined `client_name`.
 *
 * @name GetWorkEntryById
 * @route {GET} /api/work-entries/:id
 * @routeparam {number} id - Work entry ID (integer).
 * @returns {object} 200 - `{ workEntry: WorkEntryRow }`
 * @returns {object} 400 - Invalid work entry ID.
 * @returns {object} 404 - Work entry not found or not owned by user.
 * @returns {object} 500 - Database error.
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
 * Creates a new work entry for the authenticated user. The referenced
 * `clientId` must belong to the same user. The request body is validated
 * against {@link module:validation/schemas.workEntrySchema}.
 *
 * @name CreateWorkEntry
 * @route {POST} /api/work-entries
 * @bodyparam {number} clientId - ID of an existing client owned by the user.
 * @bodyparam {number} hours - Hours worked (positive, max 24, 2 decimal places).
 * @bodyparam {string} [description] - Optional description (max 1000 chars).
 * @bodyparam {string} date - Date of work in ISO 8601 format.
 * @returns {object} 201 - `{ message, workEntry: WorkEntryRow }`
 * @returns {object} 400 - Validation error or client not found.
 * @returns {object} 500 - Database error.
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
 * Partially updates an existing work entry. At least one field must be
 * provided. If `clientId` is updated it must reference a client owned by
 * the same user. Validated against
 * {@link module:validation/schemas.updateWorkEntrySchema}.
 *
 * @name UpdateWorkEntry
 * @route {PUT} /api/work-entries/:id
 * @routeparam {number} id - Work entry ID (integer).
 * @bodyparam {number} [clientId] - New client ID.
 * @bodyparam {number} [hours] - Updated hours.
 * @bodyparam {string} [description] - Updated description.
 * @bodyparam {string} [date] - Updated date (ISO 8601).
 * @returns {object} 200 - `{ message, workEntry: WorkEntryRow }`
 * @returns {object} 400 - Invalid ID, validation error, or client not found.
 * @returns {object} 404 - Work entry not found or not owned by user.
 * @returns {object} 500 - Database error.
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
 * Deletes a single work entry by ID, provided it belongs to the
 * authenticated user.
 *
 * @name DeleteWorkEntry
 * @route {DELETE} /api/work-entries/:id
 * @routeparam {number} id - Work entry ID (integer).
 * @returns {object} 200 - `{ message: "Work entry deleted successfully" }`
 * @returns {object} 400 - Invalid work entry ID.
 * @returns {object} 404 - Work entry not found or not owned by user.
 * @returns {object} 500 - Database error.
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
