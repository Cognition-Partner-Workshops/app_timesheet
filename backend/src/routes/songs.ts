import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/songs - Get songs with search and pagination
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = 'SELECT * FROM songs';
    let countQuery = 'SELECT COUNT(*) FROM songs';
    const params: (string | number)[] = [];
    const countParams: string[] = [];

    if (search) {
      query += ' WHERE title ILIKE $1 OR artist ILIKE $1 OR album ILIKE $1';
      countQuery += ' WHERE title ILIKE $1 OR artist ILIKE $1 OR album ILIKE $1';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), offset);

    const [songsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    res.json({
      songs: songsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/songs/:id/stream - Stream audio file
router.get('/:id/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    const song = result.rows[0];
    const filePath = path.resolve(song.file_path);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Audio file not found' });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/songs/upload - Upload a song (protected)
router.post(
  '/upload',
  authMiddleware,
  upload.single('audio'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No audio file provided' });
        return;
      }

      const { title, artist, album = '', duration = 0, cover_image_url = '' } = req.body;

      if (!title || !artist) {
        res.status(400).json({ error: 'Title and artist are required' });
        return;
      }

      const result = await pool.query(
        'INSERT INTO songs (title, artist, album, duration, file_path, cover_image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, artist, album, parseInt(duration), req.file.path, cover_image_url]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
