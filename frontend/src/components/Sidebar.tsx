import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Library, Plus, LogOut, Music } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getPlaylists, createPlaylist } from '../api';
import type { Playlist } from '../api';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const res = await getPlaylists();
      setPlaylists(res.data);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowNewPlaylist(false);
      loadPlaylists();
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 bg-black flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Music className="w-8 h-8 text-green-500" />
          <span className="text-xl font-bold text-white">MusicPlayer</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-1">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-4 px-3 py-2 rounded-md w-full text-left transition-colors ${
            isActive('/') ? 'text-white bg-[#282828]' : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <Home size={24} />
          <span className="font-semibold">Home</span>
        </button>
        <button
          onClick={() => navigate('/search')}
          className={`flex items-center gap-4 px-3 py-2 rounded-md w-full text-left transition-colors ${
            isActive('/search') ? 'text-white bg-[#282828]' : 'text-[#b3b3b3] hover:text-white'
          }`}
        >
          <Search size={24} />
          <span className="font-semibold">Search</span>
        </button>
      </nav>

      {/* Playlists section */}
      <div className="mt-6 px-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-3 mb-3">
          <button
            onClick={() => navigate('/playlists')}
            className="flex items-center gap-3 text-[#b3b3b3] hover:text-white transition-colors"
          >
            <Library size={24} />
            <span className="font-semibold">Your Library</span>
          </button>
          <button
            onClick={() => setShowNewPlaylist(true)}
            className="text-[#b3b3b3] hover:text-white transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {showNewPlaylist && (
          <div className="px-3 mb-3">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              placeholder="Playlist name"
              className="w-full bg-[#3E3E3E] text-white text-sm px-3 py-2 rounded-md outline-none focus:ring-1 focus:ring-green-500"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCreatePlaylist}
                className="text-xs bg-green-500 text-black px-3 py-1 rounded-full font-semibold hover:bg-green-400"
              >
                Create
              </button>
              <button
                onClick={() => { setShowNewPlaylist(false); setNewPlaylistName(''); }}
                className="text-xs text-[#b3b3b3] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => navigate(`/playlists/${playlist.id}`)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === `/playlists/${playlist.id}`
                  ? 'text-white bg-[#282828]'
                  : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              <div className="truncate">{playlist.name}</div>
              <div className="text-xs text-[#727272]">{playlist.song_count || 0} songs</div>
            </button>
          ))}
        </div>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-[#282828]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#535353] flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-sm font-semibold truncate">{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="text-[#b3b3b3] hover:text-white">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
