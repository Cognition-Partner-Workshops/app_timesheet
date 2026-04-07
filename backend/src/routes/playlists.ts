import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// All playlist routes require authentication
router.use(authMiddleware);

// POST /api/playlists - Create playlist
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Playlist name is required' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO playlists (name, user_id) VALUES ($1, $2) RETURNING *',
      [name, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/playlists - Get user's playlists
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT p.*, COUNT(ps.song_id) as song_count
       FROM playlists p
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/playlists/:id - Get playlist with songs
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const playlistResult = await pool.query(
      'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (playlistResult.rows.length === 0) {
      res.status(404).json({ error: 'Playlist not found' });
      return;
    }

    const songsResult = await pool.query(
      `SELECT s.*, ps.position
       FROM songs s
       JOIN playlist_songs ps ON s.id = ps.song_id
       WHERE ps.playlist_id = $1
       ORDER BY ps.position ASC`,
      [id]
    );

    res.json({
      ...playlistResult.rows[0],
      songs: songsResult.rows,
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/playlists/:id/songs - Add song to playlist
router.post('/:id/songs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { songId } = req.body;

    if (!songId) {
      res.status(400).json({ error: 'songId is required' });
      return;
    }

    // Verify playlist belongs to user
    const playlistResult = await pool.query(
      'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (playlistResult.rows.length === 0) {
      res.status(404).json({ error: 'Playlist not found' });
      return;
    }

    // Get max position
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM playlist_songs WHERE playlist_id = $1',
      [id]
    );
    const nextPosition = posResult.rows[0].max_pos + 1;

    await pool.query(
      'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [id, songId, nextPosition]
    );

    res.status(201).json({ message: 'Song added to playlist' });
  } catch (error) {
    console.error('Add song to playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/playlists/:id/songs/:songId - Remove song from playlist
router.delete('/:id/songs/:songId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, songId } = req.params;

    // Verify playlist belongs to user
    const playlistResult = await pool.query(
      'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (playlistResult.rows.length === 0) {
      res.status(404).json({ error: 'Playlist not found' });
      return;
    }

    await pool.query(
      'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      [id, songId]
    );

    res.json({ message: 'Song removed from playlist' });
  } catch (error) {
    console.error('Remove song from playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Playlist not found' });
      return;
    }

    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
