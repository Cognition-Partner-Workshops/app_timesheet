import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  file_path: string;
  cover_image_url: string;
  created_at: string;
}

export interface Playlist {
  id: number;
  name: string;
  user_id: number;
  created_at: string;
  song_count?: number;
  songs?: Song[];
}

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SongsResponse {
  songs: Song[];
  total: number;
  page: number;
  limit: number;
}

// Auth
export const register = (email: string, password: string, username: string) =>
  api.post<AuthResponse>('/auth/register', { email, password, username });

export const login = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password });

// Songs
export const getSongs = (params?: { search?: string; page?: number; limit?: number }) =>
  api.get<SongsResponse>('/songs', { params });

export const getStreamUrl = (songId: number) =>
  `${API_BASE}/songs/${songId}/stream`;

// Playlists
export const getPlaylists = () => api.get<Playlist[]>('/playlists');

export const getPlaylist = (id: number) => api.get<Playlist>(`/playlists/${id}`);

export const createPlaylist = (name: string) =>
  api.post<Playlist>('/playlists', { name });

export const addSongToPlaylist = (playlistId: number, songId: number) =>
  api.post(`/playlists/${playlistId}/songs`, { songId });

export const removeSongFromPlaylist = (playlistId: number, songId: number) =>
  api.delete(`/playlists/${playlistId}/songs/${songId}`);

export const deletePlaylist = (id: number) => api.delete(`/playlists/${id}`);

export default api;
