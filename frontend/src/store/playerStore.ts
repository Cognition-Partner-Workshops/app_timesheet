import { create } from 'zustand';
import { Song, getStreamUrl } from '../api';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentIndex: number;
  volume: number;
  progress: number;
  duration: number;
  audio: HTMLAudioElement;

  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextSong: () => void;
  prevSong: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  seekTo: (time: number) => void;
  setDuration: (duration: number) => void;
  setQueue: (songs: Song[]) => void;
}

const audio = new Audio();
audio.volume = 0.7;

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Set up audio event listeners
  audio.addEventListener('timeupdate', () => {
    set({ progress: audio.currentTime });
  });

  audio.addEventListener('loadedmetadata', () => {
    set({ duration: audio.duration });
  });

  audio.addEventListener('ended', () => {
    get().nextSong();
  });

  return {
    currentSong: null,
    isPlaying: false,
    queue: [],
    currentIndex: -1,
    volume: 0.7,
    progress: 0,
    duration: 0,
    audio,

    playSong: (song: Song, queue?: Song[]) => {
      const state = get();
      if (queue) {
        const index = queue.findIndex((s) => s.id === song.id);
        set({ queue, currentIndex: index >= 0 ? index : 0 });
      }

      audio.src = getStreamUrl(song.id);
      audio.play().catch(console.error);
      set({ currentSong: song, isPlaying: true, progress: 0 });

      // Update current index if song is in queue
      if (!queue) {
        const idx = state.queue.findIndex((s) => s.id === song.id);
        if (idx >= 0) set({ currentIndex: idx });
      }
    },

    togglePlay: () => {
      const { isPlaying } = get();
      if (isPlaying) {
        audio.pause();
        set({ isPlaying: false });
      } else {
        audio.play().catch(console.error);
        set({ isPlaying: true });
      }
    },

    pause: () => {
      audio.pause();
      set({ isPlaying: false });
    },

    resume: () => {
      audio.play().catch(console.error);
      set({ isPlaying: true });
    },

    nextSong: () => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return;
      const nextIndex = (currentIndex + 1) % queue.length;
      const nextSong = queue[nextIndex];
      audio.src = getStreamUrl(nextSong.id);
      audio.play().catch(console.error);
      set({ currentSong: nextSong, currentIndex: nextIndex, isPlaying: true, progress: 0 });
    },

    prevSong: () => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return;
      // If more than 3 seconds in, restart current song
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
        set({ progress: 0 });
        return;
      }
      const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
      const prevSong = queue[prevIndex];
      audio.src = getStreamUrl(prevSong.id);
      audio.play().catch(console.error);
      set({ currentSong: prevSong, currentIndex: prevIndex, isPlaying: true, progress: 0 });
    },

    setVolume: (volume: number) => {
      audio.volume = volume;
      set({ volume });
    },

    setProgress: (progress: number) => {
      set({ progress });
    },

    seekTo: (time: number) => {
      audio.currentTime = time;
      set({ progress: time });
    },

    setDuration: (duration: number) => {
      set({ duration });
    },

    setQueue: (songs: Song[]) => {
      set({ queue: songs });
    },
  };
});
