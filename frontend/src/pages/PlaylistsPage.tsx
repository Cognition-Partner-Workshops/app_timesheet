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
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#282828] to-[#121212] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Your Library</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#282828] hover:bg-[#3E3E3E] text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
        >
          <Plus size={18} />
          New Playlist
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-[#282828] p-4 rounded-lg max-w-md">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Playlist name"
            className="w-full bg-[#3E3E3E] text-white px-4 py-2 rounded-md outline-none focus:ring-1 focus:ring-green-500 mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="bg-green-500 text-black px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-green-400"
            >
              Create
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(''); }}
              className="text-[#b3b3b3] hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Music className="w-8 h-8 text-[#535353] animate-pulse" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-[#535353] mx-auto mb-4" />
          <p className="text-[#b3b3b3] mb-2">No playlists yet</p>
          <p className="text-[#727272] text-sm">Create your first playlist to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => navigate(`/playlists/${playlist.id}`)}
              className="bg-[#181818] hover:bg-[#282828] p-4 rounded-lg text-left transition-colors group"
            >
              <div className="w-full aspect-square bg-[#282828] group-hover:bg-[#333] rounded-md mb-4 flex items-center justify-center">
                <Music className="w-12 h-12 text-[#535353]" />
              </div>
              <h3 className="text-white font-semibold text-sm truncate">{playlist.name}</h3>
              <p className="text-[#b3b3b3] text-xs mt-1">{playlist.song_count || 0} songs</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistsPage;
