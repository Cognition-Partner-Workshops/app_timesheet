import React, { useEffect, useState } from 'react';
import { Clock, Music } from 'lucide-react';
import { getSongs } from '../api';
import type { Song } from '../api';
import SongRow from '../components/SongRow';

const HomePage: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const res = await getSongs({ limit: 50 });
      setSongs(res.data.songs);
    } catch (err) {
      console.error('Failed to load songs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#1a3a2a] to-[#121212] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Good {getGreeting()}</h1>
        <p className="text-[#b3b3b3]">Discover and play your favorite music</p>
      </div>

      {/* All songs */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">All Songs</h2>

        {/* Header row */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[#333] text-[#b3b3b3] text-sm mb-2">
          <div className="w-8 text-center">#</div>
          <div className="flex-1">Title</div>
          <div className="hidden md:block w-48">Album</div>
          <div className="w-8" />
          <div className="w-12 text-right flex items-center justify-end">
            <Clock size={14} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Music className="w-8 h-8 text-[#535353] animate-pulse" />
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-12 h-12 text-[#535353] mx-auto mb-4" />
            <p className="text-[#b3b3b3]">No songs found</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {songs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} songs={songs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

export default HomePage;
