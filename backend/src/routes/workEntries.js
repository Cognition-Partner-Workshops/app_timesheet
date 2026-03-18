/**
 * @module routes/workEntries
 * @description Work-entry management route handlers.
 *
 * Mounted at `/api/work-entries`. All routes require the `x-user-email`
 * header (enforced by {@link module:middleware/auth~authenticateUser} at
 * router level). Work entries are scoped to the authenticated user and
 * linked to a client that the user owns.
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { workEntrySchema, updateWorkEntrySchema } = require('../validation/schemas');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * GET /api/work-entries?clientId=<id>
 *
 * Returns all work entries for the authenticated user. Results include the
 * associated client name and are ordered by date descending.
 *
 * Query params (optional):
 *  - `clientId` (integer) — filter entries to a specific client.
 *
 * Success response (200):
 * ```json
 * {
 *   "workEntries": [
 *     { "id": 1, "client_id": 2, "hours": 3.5, "description": "...",
 *       "date": "2024-01-15", "client_name": "Acme Corp", ... }
 *   ]
 * }
 * ```
 *
 * Error responses:
 *  - `400` — invalid (non-numeric) `clientId` query param.
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
 * Returns a single work entry by ID. The entry must belong to the
 * authenticated user.
 *
 * Path params:
 *  - `id` (integer) — work entry ID.
 *
 * Success response (200):
 * ```json
 * { "workEntry": { "id": 1, "client_id": 2, "hours": 3.5, ... } }
 * ```
 *
 * Error responses:
 *  - `400` — invalid (non-numeric) ID.
 *  - `404` — work entry not found or not owned by the user.
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
 * client must exist and belong to the user.
 *
 * Request body — validated by {@link module:validation/schemas~workEntrySchema}:
 * ```json
 * { "clientId": 2, "hours": 3.5, "description": "API integration", "date": "2024-01-15" }
 * ```
 *
 * Success response (201):
 * ```json
 * { "message": "Work entry created successfully", "workEntry": { ... } }
 * ```
 *
 * Error responses:
 *  - `400` — validation error or client not found / not owned by user.
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
 * Partially updates a work entry. Only the supplied fields are changed;
 * omitted fields remain as-is. If `clientId` is changed, the new client
 * must also belong to the user. The `updated_at` timestamp is refreshed
 * automatically.
 *
 * Path params:
 *  - `id` (integer) — work entry ID.
 *
 * Request body — validated by {@link module:validation/schemas~updateWorkEntrySchema}:
 * ```json
 * { "hours": 4.0 }
 * ```
 *
 * Success response (200):
 * ```json
 * { "message": "Work entry updated successfully", "workEntry": { ... } }
 * ```
 *
 * Error responses:
 *  - `400` — invalid ID, validation error, or target client not owned by user.
 *  - `404` — work entry not found or not owned by the user.
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
 * Deletes a single work entry. The entry must belong to the authenticated
 * user.
 *
 * Path params:
 *  - `id` (integer) — work entry ID.
 *
 * Success response (200):
 * ```json
 * { "message": "Work entry deleted successfully" }
 * ```
 *
 * Error responses:
 *  - `400` — invalid (non-numeric) ID.
 *  - `404` — work entry not found or not owned by the user.
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
