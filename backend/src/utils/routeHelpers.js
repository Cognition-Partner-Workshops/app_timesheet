const { getDatabase } = require('../database/init');

function parseId(req, res, entityName) {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: `Invalid ${entityName} ID` });
    return null;
  }
  return id;
}

function dbError(res, message = 'Internal server error') {
  return (err) => {
    console.error('Database error:', err);
    res.status(500).json({ error: message });
  };
}

function checkOwnership(db, table, id, userEmail, callback) {
  db.get(
    `SELECT id FROM ${table} WHERE id = ? AND user_email = ?`,
    [id, userEmail],
    callback
  );
}

function buildUpdateQuery(table, fieldMap, value) {
  const updates = [];
  const values = [];

  for (const [bodyKey, dbColumn] of Object.entries(fieldMap)) {
    if (value[bodyKey] !== undefined) {
      updates.push(`${dbColumn} = ?`);
      values.push(value[bodyKey] || null);
    }
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  return { updates, values };
}

module.exports = { parseId, dbError, checkOwnership, buildUpdateQuery };
