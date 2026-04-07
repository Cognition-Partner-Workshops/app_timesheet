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
      className={`group flex items-center gap-4 px-4 py-2 rounded-md hover:bg-[#2a2a2a] transition-colors ${
        isCurrentSong ? 'bg-[#2a2a2a]' : ''
      }`}
    >
      {/* Track number / play button */}
      <div className="w-8 text-center">
        <span className={`group-hover:hidden text-sm ${isCurrentSong ? 'text-green-500' : 'text-[#b3b3b3]'}`}>
          {isCurrentSong && isPlaying ? '♫' : index + 1}
        </span>
        <button onClick={handlePlay} className="hidden group-hover:block text-white mx-auto">
          {isCurrentSong && isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      {/* Song info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-[#333] rounded flex items-center justify-center flex-shrink-0">
          {song.cover_image_url ? (
            <img src={song.cover_image_url} alt={song.title} className="w-full h-full object-cover rounded" />
          ) : (
            <Music className="w-4 h-4 text-[#727272]" />
          )}
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${isCurrentSong ? 'text-green-500' : 'text-white'}`}>
            {song.title}
          </div>
          <div className="text-xs text-[#b3b3b3] truncate">{song.artist}</div>
        </div>
      </div>

      {/* Album */}
      <div className="hidden md:block w-48 text-sm text-[#b3b3b3] truncate">{song.album}</div>

      {/* Add to playlist button */}
      <div className="relative">
        <button
          onClick={handleAddToPlaylist}
          className="opacity-0 group-hover:opacity-100 text-[#b3b3b3] hover:text-white transition-all"
        >
          <Plus size={18} />
        </button>
        {showPlaylistMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
            <div className="absolute right-0 top-6 z-50 bg-[#282828] rounded-md shadow-xl py-1 min-w-[180px]">
              <div className="px-3 py-2 text-xs text-[#b3b3b3] font-semibold">Add to playlist</div>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPlaylist(p.id)}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#3E3E3E] transition-colors"
                >
                  {p.name}
                </button>
              ))}
              {playlists.length === 0 && (
                <div className="px-3 py-2 text-sm text-[#727272]">No playlists yet</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Duration */}
      <div className="w-12 text-right text-sm text-[#b3b3b3]">{formatDuration(song.duration)}</div>
    </div>
  );
};

export default SongRow;
