import pool, { initDatabase } from './config/database';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const seedDatabase = async () => {
  try {
    await initDatabase();

    // Create demo user
    const passwordHash = await bcrypt.hash('demo123', 12);
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, username)
       VALUES ('demo@musicplayer.com', $1, 'DemoUser')
       ON CONFLICT (email) DO UPDATE SET username = 'DemoUser'
       RETURNING id`,
      [passwordHash]
    );
    const userId = userResult.rows[0].id;
    console.log('Demo user created/updated (id:', userId, ')');

    // Insert sample songs
    const songs = [
      { title: 'Midnight Groove', artist: 'The Night Owls', album: 'After Dark', duration: 245 },
      { title: 'Electric Dreams', artist: 'Synth Wave', album: 'Neon Lights', duration: 198 },
      { title: 'Ocean Breeze', artist: 'Coastal Vibes', album: 'Summer Collection', duration: 312 },
      { title: 'Urban Jungle', artist: 'City Beats', album: 'Street Sound', duration: 267 },
      { title: 'Starlight Serenade', artist: 'Cosmos', album: 'Galaxy', duration: 224 },
      { title: 'Rainy Day Jazz', artist: 'Blue Note Trio', album: 'Café Sessions', duration: 289 },
      { title: 'Sunset Boulevard', artist: 'The Dreamers', album: 'Golden Hour', duration: 201 },
      { title: 'Digital Love', artist: 'Pixel Hearts', album: 'Binary Romance', duration: 176 },
      { title: 'Mountain Echo', artist: 'Nature Sound', album: 'Wilderness', duration: 334 },
      { title: 'Funky Town', artist: 'Groove Masters', album: 'Dance Floor', duration: 256 },
      { title: 'Crystal Clear', artist: 'Glass Symphony', album: 'Transparency', duration: 218 },
      { title: 'Velvet Touch', artist: 'Smooth Jazz Ensemble', album: 'Elegance', duration: 301 },
    ];

    for (const song of songs) {
      await pool.query(
        `INSERT INTO songs (title, artist, album, duration, file_path, cover_image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          song.title,
          song.artist,
          song.album,
          song.duration,
          `uploads/sample.mp3`,
          '',
        ]
      );
    }
    console.log('Sample songs inserted');

    // Create sample playlists
    const playlist1 = await pool.query(
      `INSERT INTO playlists (name, user_id) VALUES ('Chill Vibes', $1) RETURNING id`,
      [userId]
    );
    const playlist2 = await pool.query(
      `INSERT INTO playlists (name, user_id) VALUES ('Party Mix', $1) RETURNING id`,
      [userId]
    );
    const playlist3 = await pool.query(
      `INSERT INTO playlists (name, user_id) VALUES ('Focus Mode', $1) RETURNING id`,
      [userId]
    );

    // Get song IDs
    const allSongs = await pool.query('SELECT id FROM songs ORDER BY id LIMIT 12');
    const songIds = allSongs.rows.map((s: { id: number }) => s.id);

    // Add songs to playlists
    if (songIds.length >= 4) {
      for (let i = 0; i < 4; i++) {
        await pool.query(
          'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [playlist1.rows[0].id, songIds[i], i]
        );
      }
    }
    if (songIds.length >= 8) {
      for (let i = 3; i < 8; i++) {
        await pool.query(
          'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [playlist2.rows[0].id, songIds[i], i - 3]
        );
      }
    }
    if (songIds.length >= 12) {
      for (let i = 5; i < 10; i++) {
        await pool.query(
          'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [playlist3.rows[0].id, songIds[i], i - 5]
        );
      }
    }
    console.log('Sample playlists created with songs');

    console.log('\nSeed complete! Login with:');
    console.log('  Email: demo@musicplayer.com');
    console.log('  Password: demo123');

    await pool.end();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
