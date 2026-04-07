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
    <div className="flex-1 overflow-y-auto bg-[#fafafa] p-6">
      {/* Search input */}
      <div className="mb-8">
        <div className="relative max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" size={20} />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Artists, Songs, or Albums"
            className="w-full bg-[#e8e8ed] text-[#1d1d1f] pl-12 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#fc3c44] placeholder-[#86868b] text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Music className="w-8 h-8 text-[#d1d1d6] animate-pulse" />
        </div>
      ) : searched && songs.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-[#d1d1d6] mx-auto mb-4" />
          <p className="text-[#86868b]">No results found for &ldquo;{query}&rdquo;</p>
        </div>
      ) : songs.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e8ed] p-4">
          <h2 className="text-xl font-bold text-[#1d1d1f] mb-4 px-2">Results</h2>
          <div className="space-y-0.5">
            {songs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} songs={songs} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-[#d1d1d6] mx-auto mb-4" />
          <p className="text-[#86868b]">Search for songs, artists, or albums</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
