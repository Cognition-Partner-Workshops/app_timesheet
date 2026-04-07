import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Plus } from 'lucide-react';
import { getPlaylists, createPlaylist } from '../api';
import type { Playlist } from '../api';

const PlaylistsPage: React.FC = () => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const res = await getPlaylists();
      setPlaylists(res.data);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await createPlaylist(newName.trim());
      setNewName('');
      setShowCreate(false);
      navigate(`/playlists/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#1d1d1f]">Your Library</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#fc3c44] hover:bg-[#e8384f] text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
        >
          <Plus size={18} />
          New Playlist
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-[#e8e8ed] max-w-md">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Playlist name"
            className="w-full bg-[#f5f5f7] text-[#1d1d1f] px-4 py-2 rounded-xl outline-none border border-[#d2d2d7] focus:border-[#fc3c44] focus:ring-1 focus:ring-[#fc3c44] mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="bg-[#fc3c44] text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-[#e8384f]"
            >
              Create
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(''); }}
              className="text-[#86868b] hover:text-[#1d1d1f] text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Music className="w-8 h-8 text-[#d1d1d6] animate-pulse" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-[#d1d1d6] mx-auto mb-4" />
          <p className="text-[#86868b] mb-2">No playlists yet</p>
          <p className="text-[#86868b] text-sm">Create your first playlist to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => navigate(`/playlists/${playlist.id}`)}
              className="bg-white hover:bg-[#f5f5f7] p-4 rounded-2xl text-left transition-colors group shadow-sm border border-[#e8e8ed]"
            >
              <div className="w-full aspect-square bg-gradient-to-br from-[#fc3c44]/10 to-[#ff6b6b]/10 group-hover:from-[#fc3c44]/20 group-hover:to-[#ff6b6b]/20 rounded-xl mb-4 flex items-center justify-center">
                <Music className="w-12 h-12 text-[#fc3c44]/40" />
              </div>
              <h3 className="text-[#1d1d1f] font-semibold text-sm truncate">{playlist.name}</h3>
              <p className="text-[#86868b] text-xs mt-1">{playlist.song_count || 0} songs</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistsPage;
