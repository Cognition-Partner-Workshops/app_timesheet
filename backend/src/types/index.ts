import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: number;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  username: string;
  created_at: Date;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  file_path: string;
  cover_image_url: string;
  created_at: Date;
}

export interface Playlist {
  id: number;
  name: string;
  user_id: number;
  created_at: Date;
}

export interface PlaylistSong {
  playlist_id: number;
  song_id: number;
  position: number;
}
