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
    <div className="w-64 bg-[#fbfbfd]/95 glass border-r border-[#d2d2d7] flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#fc3c44] to-[#e8384f] rounded-lg flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#1d1d1f]">Music</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-0.5">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left transition-colors ${
            isActive('/') ? 'bg-[#fc3c44] text-white' : 'text-[#1d1d1f] hover:bg-[#e8e8ed]'
          }`}
        >
          <Home size={20} />
          <span className="font-medium text-sm">Listen Now</span>
        </button>
        <button
          onClick={() => navigate('/search')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left transition-colors ${
            isActive('/search') ? 'bg-[#fc3c44] text-white' : 'text-[#1d1d1f] hover:bg-[#e8e8ed]'
          }`}
        >
          <Search size={20} />
          <span className="font-medium text-sm">Search</span>
        </button>
      </nav>

      {/* Playlists section */}
      <div className="mt-6 px-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-3 mb-2">
          <button
            onClick={() => navigate('/playlists')}
            className="flex items-center gap-2 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
          >
            <Library size={18} />
            <span className="font-semibold text-xs uppercase tracking-wider">Library</span>
          </button>
          <button
            onClick={() => setShowNewPlaylist(true)}
            className="text-[#fc3c44] hover:text-[#e8384f] transition-colors"
          >
            <Plus size={18} />
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
              className="w-full bg-white text-[#1d1d1f] text-sm px-3 py-2 rounded-lg outline-none border border-[#d2d2d7] focus:border-[#fc3c44] focus:ring-1 focus:ring-[#fc3c44]"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCreatePlaylist}
                className="text-xs bg-[#fc3c44] text-white px-3 py-1 rounded-full font-semibold hover:bg-[#e8384f]"
              >
                Create
              </button>
              <button
                onClick={() => { setShowNewPlaylist(false); setNewPlaylistName(''); }}
                className="text-xs text-[#86868b] hover:text-[#1d1d1f]"
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
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === `/playlists/${playlist.id}`
                  ? 'bg-[#e8e8ed] text-[#1d1d1f] font-medium'
                  : 'text-[#424245] hover:bg-[#e8e8ed]'
              }`}
            >
              <div className="truncate">{playlist.name}</div>
              <div className="text-xs text-[#86868b]">{playlist.song_count || 0} songs</div>
            </button>
          ))}
        </div>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-[#d2d2d7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fc3c44] to-[#ff6b6b] flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium text-[#1d1d1f] truncate">{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="text-[#86868b] hover:text-[#fc3c44] transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
