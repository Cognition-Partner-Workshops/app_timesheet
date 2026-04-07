import React, { useState, useEffect, useRef } from 'react';
import { Search, Music } from 'lucide-react';
import { getSongs } from '../api';
import type { Song } from '../api';
import SongRow from '../components/SongRow';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setSongs([]);
      setSearched(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await getSongs({ search: query, limit: 50 });
        setSongs(res.data.songs);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#282828] to-[#121212] p-6">
      {/* Search input */}
      <div className="mb-8">
        <div className="relative max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#727272]" size={20} />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="What do you want to listen to?"
            className="w-full bg-[#3E3E3E] text-white pl-12 pr-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-white placeholder-[#727272] text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Music className="w-8 h-8 text-[#535353] animate-pulse" />
        </div>
      ) : searched && songs.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-[#535353] mx-auto mb-4" />
          <p className="text-[#b3b3b3]">No results found for "{query}"</p>
        </div>
      ) : songs.length > 0 ? (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Results</h2>
          <div className="space-y-0.5">
            {songs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} songs={songs} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-[#535353] mx-auto mb-4" />
          <p className="text-[#b3b3b3]">Search for songs, artists, or albums</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
