import React, { createContext, useContext, useRef, useState, useEffect } from 'react';

export type AnimationStyle = 'static' | 'wave' | 'vinyl';

export interface Song {
  id: string;
  title: string;
  artist_name: string;
  audio_url: string;
  cover_url: string;
  genre_id: string;
  artist_id: string;
  duration: number;
  play_count: number;
  is_active: boolean;
  genres?: { name: string; color: string };
  profiles?: { username: string; avatar_url: string };
}

interface PlayerContextType {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  animStyle: AnimationStyle;
  setAnimStyle: (s: AnimationStyle) => void;
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  addToQueue: (song: Song) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const PlayerContext = createContext<PlayerContextType>(null!);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [animStyle, setAnimStyle] = useState<AnimationStyle>('vinyl');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous'; // penting untuk CORS
    audioRef.current = audio;
    audio.volume = volume;
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('durationchange', () => setDuration(isNaN(audio.duration) ? 0 : audio.duration));
    audio.addEventListener('ended', () => nextSong());
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    });
    audio.addEventListener('canplay', () => {
      // Audio siap diputar
      console.log('Audio siap diputar');
    });
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  const playSong = (song: Song, newQueue?: Song[]) => {
    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(s => s.id === song.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    }
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(0);
    const audio = audioRef.current!;
    audio.pause();
    audio.src = song.audio_url;
    audio.load(); // paksa reload
    audio.play().catch(err => {
      console.error('Play error:', err);
      setIsPlaying(false);
    });
  };

  const togglePlay = () => {
    const audio = audioRef.current!;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(console.error);
  };

  const nextSong = () => {
    if (queue.length === 0) return;
    const next = (queueIndex + 1) % queue.length;
    setQueueIndex(next);
    playSong(queue[next]);
  };

  const prevSong = () => {
    if (queue.length === 0) return;
    const prev = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prev);
    playSong(queue[prev]);
  };

  const seek = (t: number) => {
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const addToQueue = (song: Song) => {
    setQueue(q => [...q, song]);
  };

  return (
    <PlayerContext.Provider value={{
      currentSong, queue, isPlaying, currentTime, duration, volume, animStyle,
      setAnimStyle, playSong, togglePlay, nextSong, prevSong, seek, setVolume, addToQueue, audioRef
    }}>
      {children}
    </PlayerContext.Provider>
  );
}
