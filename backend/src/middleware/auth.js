const { getDatabase } = require('../database/init');

// Simple email-based authentication middleware
async function authenticateUser(req, res, next) {
  const userEmail = req.headers['x-user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: 'User email required in x-user-email header' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const pool = getDatabase();

    const { rows } = await pool.query(
      'SELECT email FROM users WHERE email = $1',
      [userEmail]
    );

    if (!rows[0]) {
      await pool.query('INSERT INTO users (email) VALUES ($1)', [userEmail]);
    }

    req.userEmail = userEmail;
    next();
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  authenticateUser
};
