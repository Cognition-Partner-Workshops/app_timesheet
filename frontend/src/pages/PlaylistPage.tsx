import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Trash2, Music, Clock } from 'lucide-react';
import { getPlaylist, deletePlaylist, removeSongFromPlaylist } from '../api';
import type { Playlist, Song } from '../api';
import { usePlayerStore } from '../store/playerStore';
import SongRow from '../components/SongRow';

const PlaylistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playSong } = usePlayerStore();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadPlaylist(parseInt(id));
  }, [id]);

  const loadPlaylist = async (playlistId: number) => {
    try {
      const res = await getPlaylist(playlistId);
      setPlaylist(res.data);
    } catch (err) {
      console.error('Failed to load playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (playlist?.songs && playlist.songs.length > 0) {
      playSong(playlist.songs[0], playlist.songs);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (confirm('Delete this playlist?')) {
      try {
        await deletePlaylist(parseInt(id));
        navigate('/');
      } catch (err) {
        console.error('Failed to delete playlist:', err);
      }
    }
  };

  const handleRemoveSong = async (songId: number) => {
    if (!id) return;
    try {
      await removeSongFromPlaylist(parseInt(id), songId);
      loadPlaylist(parseInt(id));
    } catch (err) {
      console.error('Failed to remove song:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
        <Music className="w-8 h-8 text-[#d1d1d6] animate-pulse" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
        <p className="text-[#86868b]">Playlist not found</p>
      </div>
    );
  }

  const songs: Song[] = playlist.songs || [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      {/* Playlist header */}
      <div className="p-6 pb-4 flex items-end gap-6">
        <div className="w-48 h-48 bg-gradient-to-br from-[#fc3c44]/20 to-[#ff6b6b]/20 rounded-2xl shadow-lg flex items-center justify-center flex-shrink-0">
          <Music className="w-16 h-16 text-[#fc3c44]/40" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-[#86868b] mb-2 tracking-wider">Playlist</p>
          <h1 className="text-4xl font-bold text-[#1d1d1f] mb-3">{playlist.name}</h1>
          <p className="text-[#86868b] text-sm">{songs.length} songs</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex items-center gap-4">
        <button
          onClick={handlePlayAll}
          disabled={songs.length === 0}
          className="w-12 h-12 rounded-full bg-[#fc3c44] flex items-center justify-center hover:bg-[#e8384f] hover:scale-105 transition-all disabled:opacity-50 shadow-md"
        >
          <Play size={22} className="text-white ml-0.5" fill="white" />
        </button>
        <button
          onClick={handleDelete}
          className="text-[#86868b] hover:text-[#fc3c44] transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Songs list */}
      <div className="px-6">
        {songs.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-12 h-12 text-[#d1d1d6] mx-auto mb-4" />
            <p className="text-[#86868b] mb-2">This playlist is empty</p>
            <p className="text-[#86868b] text-sm">Search for songs and add them to this playlist</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e8e8ed] p-4">
            <div className="flex items-center gap-4 px-4 py-2 border-b border-[#e8e8ed] text-[#86868b] text-xs font-medium uppercase tracking-wider mb-1">
              <div className="w-8 text-center">#</div>
              <div className="flex-1">Title</div>
              <div className="hidden md:block w-48">Album</div>
              <div className="w-8" />
              <div className="w-12 text-right flex items-center justify-end">
                <Clock size={14} />
              </div>
            </div>
            <div className="space-y-0.5">
              {songs.map((song, i) => (
                <div key={song.id} className="group relative">
                  <SongRow song={song} index={i} songs={songs} />
                  <button
                    onClick={() => handleRemoveSong(song.id)}
                    className="absolute right-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[#86868b] hover:text-[#fc3c44] transition-all"
                    title="Remove from playlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistPage;
