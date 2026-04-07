import React, { useState } from 'react';
import { Play, Pause, Plus, Music } from 'lucide-react';
import { addSongToPlaylist, getPlaylists } from '../api';
import type { Song, Playlist } from '../api';
import { usePlayerStore } from '../store/playerStore';

interface SongRowProps {
  song: Song;
  index: number;
  songs: Song[];
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const SongRow: React.FC<SongRowProps> = ({ song, index, songs }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayerStore();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const isCurrentSong = currentSong?.id === song.id;

  const handlePlay = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      playSong(song, songs);
    }
  };

  const handleAddToPlaylist = async () => {
    try {
      const res = await getPlaylists();
      setPlaylists(res.data);
      setShowPlaylistMenu(true);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  };

  const handleSelectPlaylist = async (playlistId: number) => {
    try {
      await addSongToPlaylist(playlistId, song.id);
      setShowPlaylistMenu(false);
    } catch (err) {
      console.error('Failed to add song:', err);
    }
  };

  return (
    <div
      className={`group flex items-center gap-4 px-4 py-2.5 rounded-xl hover:bg-[#f5f5f7] transition-colors ${
        isCurrentSong ? 'bg-[#f5f5f7]' : ''
      }`}
    >
      {/* Track number / play button */}
      <div className="w-8 text-center">
        <span className={`group-hover:hidden text-sm ${isCurrentSong ? 'text-[#fc3c44]' : 'text-[#86868b]'}`}>
          {isCurrentSong && isPlaying ? '♫' : index + 1}
        </span>
        <button onClick={handlePlay} className="hidden group-hover:block text-[#fc3c44] mx-auto">
          {isCurrentSong && isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      {/* Song info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-[#f5f5f7] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          {song.cover_image_url ? (
            <img src={song.cover_image_url} alt={song.title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Music className="w-4 h-4 text-[#86868b]" />
          )}
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${isCurrentSong ? 'text-[#fc3c44]' : 'text-[#1d1d1f]'}`}>
            {song.title}
          </div>
          <div className="text-xs text-[#86868b] truncate">{song.artist}</div>
        </div>
      </div>

      {/* Album */}
      <div className="hidden md:block w-48 text-sm text-[#86868b] truncate">{song.album}</div>

      {/* Add to playlist button */}
      <div className="relative">
        <button
          onClick={handleAddToPlaylist}
          className="opacity-0 group-hover:opacity-100 text-[#86868b] hover:text-[#fc3c44] transition-all"
        >
          <Plus size={18} />
        </button>
        {showPlaylistMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
            <div className="absolute right-0 top-6 z-50 bg-white rounded-xl shadow-lg border border-[#d2d2d7] py-1 min-w-[180px]">
              <div className="px-3 py-2 text-xs text-[#86868b] font-semibold">Add to playlist</div>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPlaylist(p.id)}
                  className="w-full text-left px-3 py-2 text-sm text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
                >
                  {p.name}
                </button>
              ))}
              {playlists.length === 0 && (
                <div className="px-3 py-2 text-sm text-[#86868b]">No playlists yet</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Duration */}
      <div className="w-12 text-right text-sm text-[#86868b]">{formatDuration(song.duration)}</div>
    </div>
  );
};

export default SongRow;
