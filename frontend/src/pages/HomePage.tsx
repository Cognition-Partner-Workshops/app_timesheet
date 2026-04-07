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
    <div className="flex-1 overflow-y-auto bg-[#fafafa] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1d1d1f] mb-1">Good {getGreeting()}</h1>
        <p className="text-[#86868b]">Discover and play your favorite music</p>
      </div>

      {/* All songs */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e8ed] p-4">
        <h2 className="text-xl font-bold text-[#1d1d1f] mb-4 px-2">All Songs</h2>

        {/* Header row */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[#e8e8ed] text-[#86868b] text-xs font-medium uppercase tracking-wider mb-1">
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
            <Music className="w-8 h-8 text-[#d1d1d6] animate-pulse" />
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-12 h-12 text-[#d1d1d6] mx-auto mb-4" />
            <p className="text-[#86868b]">No songs found</p>
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
