import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';

const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Player: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    duration,
    togglePlay,
    nextSong,
    prevSong,
    setVolume,
    seekTo,
  } = usePlayerStore();

  if (!currentSong) {
    return (
      <div className="h-20 bg-[#181818] border-t border-[#282828] flex items-center justify-center">
        <p className="text-[#727272] text-sm">No song playing</p>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="h-22 bg-[#181818] border-t border-[#282828] px-4 flex items-center">
      {/* Song info - left */}
      <div className="flex items-center gap-3 w-72 min-w-0">
        <div className="w-14 h-14 bg-[#282828] rounded flex items-center justify-center flex-shrink-0">
          {currentSong.cover_image_url ? (
            <img
              src={currentSong.cover_image_url}
              alt={currentSong.title}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <Music className="w-6 h-6 text-[#727272]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">{currentSong.title}</div>
          <div className="text-xs text-[#b3b3b3] truncate">{currentSong.artist}</div>
        </div>
      </div>

      {/* Controls - center */}
      <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto">
        <div className="flex items-center gap-5 mb-1">
          <button onClick={prevSong} className="text-[#b3b3b3] hover:text-white transition-colors">
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause size={16} className="text-black" fill="black" />
            ) : (
              <Play size={16} className="text-black ml-0.5" fill="black" />
            )}
          </button>
          <button onClick={nextSong} className="text-[#b3b3b3] hover:text-white transition-colors">
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-[#b3b3b3] w-10 text-right">{formatTime(progress)}</span>
          <div className="flex-1 relative group">
            <div className="w-full h-1 bg-[#535353] rounded-full">
              <div
                className="h-full bg-white rounded-full group-hover:bg-green-500 transition-colors"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs text-[#b3b3b3] w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume - right */}
      <div className="flex items-center gap-2 w-36 justify-end">
        <button
          onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
          className="text-[#b3b3b3] hover:text-white transition-colors"
        >
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div className="relative w-24 group">
          <div className="w-full h-1 bg-[#535353] rounded-full">
            <div
              className="h-full bg-white rounded-full group-hover:bg-green-500 transition-colors"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default Player;
