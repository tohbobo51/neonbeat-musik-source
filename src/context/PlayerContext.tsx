import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
  import supabase from '../lib/supabase';

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
    profiles?: { username: string; avatar_url: string; is_verified?: boolean };
  }

  interface PlayerContextType {
    currentSong: Song | null;
    queue: Song[];
    queueIndex: number;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    animStyle: AnimationStyle;
    radioMode: boolean;
    setAnimStyle: (s: AnimationStyle) => void;
    setRadioMode: (on: boolean) => void;
    playSong: (song: Song, queue?: Song[]) => void;
    togglePlay: () => void;
    nextSong: () => void;
    prevSong: () => void;
    seek: (t: number) => void;
    setVolume: (v: number) => void;
    addToQueue: (song: Song) => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (songs: Song[]) => void;
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
    const [radioMode, setRadioModeState] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const queueRef = useRef<Song[]>([]);
    const queueIndexRef = useRef(0);
    const radioModeRef = useRef(false);
    const fetchingRadioRef = useRef(false);

    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);

    const setRadioMode = (on: boolean) => {
      radioModeRef.current = on;
      setRadioModeState(on);
    };

    const playAtIndex = (songs: Song[], idx: number) => {
      if (idx < 0 || idx >= songs.length) return;
      const song = songs[idx];
      setCurrentSong(song);
      setQueueIndex(idx);
      queueIndexRef.current = idx;
      setCurrentTime(0);
      setDuration(0);
      const audio = audioRef.current!;
      audio.pause();
      audio.src = song.audio_url;
      audio.load();
      audio.play().catch(() => setIsPlaying(false));
    };

    const fetchRadioSongs = async (baseSong: Song | null) => {
      if (fetchingRadioRef.current || !baseSong) return;
      fetchingRadioRef.current = true;
      try {
        const genreParam = baseSong.genre_id ? `&genre_id=${baseSong.genre_id}` : '';
        const res = await fetch(`/api/extras?route=recommendations&limit=5${genreParam}`);
        const newSongs: Song[] = await res.json();
        if (Array.isArray(newSongs) && newSongs.length > 0) {
          const existingIds = new Set(queueRef.current.map(s => s.id));
          const fresh = newSongs.filter(s => !existingIds.has(s.id));
          if (fresh.length > 0) {
            setQueue(prev => {
              const updated = [...prev, ...fresh];
              queueRef.current = updated;
              return updated;
            });
            const nextIdx = queueRef.current.length - fresh.length;
            setTimeout(() => playAtIndex(queueRef.current, nextIdx), 100);
          }
        }
      } catch {}
      fetchingRadioRef.current = false;
    };

    // Stop music when user logs out
    useEffect(() => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          const audio = audioRef.current;
          if (audio) { audio.pause(); audio.src = ''; }
          setCurrentSong(null);
          setIsPlaying(false);
          setQueue([]);
          setQueueIndex(0);
          queueRef.current = [];
          queueIndexRef.current = 0;
        }
      });
      return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      audio.volume = volume;

      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('durationchange', () => setDuration(isNaN(audio.duration) ? 0 : audio.duration));
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('error', () => setIsPlaying(false));

      audio.addEventListener('ended', () => {
        const q = queueRef.current;
        const idx = queueIndexRef.current;
        if (q.length === 0) return;
        const isLast = idx >= q.length - 1;
        if (radioModeRef.current && isLast) {
          fetchRadioSongs(q[idx]);
          return;
        }
        const next = isLast ? 0 : idx + 1;
        if (!isLast || q.length > 1) {
          setQueueIndex(next);
          queueIndexRef.current = next;
          setCurrentSong(q[next]);
          setCurrentTime(0);
          setDuration(0);
          audio.pause();
          audio.src = q[next].audio_url;
          audio.load();
          audio.play().catch(() => setIsPlaying(false));
        }
      });

      return () => { audio.pause(); audio.src = ''; };
    }, []);

    const playSong = (song: Song, newQueue?: Song[]) => {
      if (newQueue) {
        setQueue(newQueue);
        queueRef.current = newQueue;
        const idx = newQueue.findIndex(s => s.id === song.id);
        const realIdx = idx >= 0 ? idx : 0;
        setQueueIndex(realIdx);
        queueIndexRef.current = realIdx;
      }
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(0);
      const audio = audioRef.current!;
      audio.pause();
      audio.src = song.audio_url;
      audio.load();
      audio.play().catch(() => setIsPlaying(false));
    };

    const togglePlay = () => {
      const audio = audioRef.current!;
      if (!audio) return;
      if (isPlaying) audio.pause();
      else audio.play().catch(console.error);
    };

    const nextSong = () => {
      const q = queueRef.current;
      const idx = queueIndexRef.current;
      if (q.length === 0) return;
      const next = (idx + 1) % q.length;
      setQueueIndex(next);
      queueIndexRef.current = next;
      playSong(q[next]);
    };

    const prevSong = () => {
      const q = queueRef.current;
      const idx = queueIndexRef.current;
      if (q.length === 0) return;
      const prev = (idx - 1 + q.length) % q.length;
      setQueueIndex(prev);
      queueIndexRef.current = prev;
      playSong(q[prev]);
    };

    const seek = (t: number) => {
      if (audioRef.current) audioRef.current.currentTime = t;
    };

    const setVolume = (v: number) => {
      setVolumeState(v);
      if (audioRef.current) audioRef.current.volume = v;
    };

    const addToQueue = (song: Song) => {
      setQueue(q => {
        const updated = [...q, song];
        queueRef.current = updated;
        return updated;
      });
    };

    const removeFromQueue = (index: number) => {
      setQueue(q => {
        const updated = [...q];
        updated.splice(index, 1);
        queueRef.current = updated;
        // Adjust current index if needed
        const currentIdx = queueIndexRef.current;
        if (index < currentIdx) {
          const newIdx = currentIdx - 1;
          setQueueIndex(newIdx);
          queueIndexRef.current = newIdx;
        } else if (index === currentIdx) {
          // Removed the currently playing song — play next if available
          if (updated.length > 0) {
            const nextIdx = Math.min(currentIdx, updated.length - 1);
            setQueueIndex(nextIdx);
            queueIndexRef.current = nextIdx;
            setCurrentSong(updated[nextIdx]);
            const audio = audioRef.current!;
            audio.pause();
            audio.src = updated[nextIdx].audio_url;
            audio.load();
            audio.play().catch(() => setIsPlaying(false));
          } else {
            setCurrentSong(null);
            setIsPlaying(false);
            if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
          }
        }
        return updated;
      });
    };

    const reorderQueue = (songs: Song[]) => {
      // Find where currentSong lands in the new order
      const currentId = currentSong?.id;
      const newIdx = currentId ? songs.findIndex(s => s.id === currentId) : queueIndexRef.current;
      const realIdx = newIdx >= 0 ? newIdx : 0;
      setQueue(songs);
      queueRef.current = songs;
      setQueueIndex(realIdx);
      queueIndexRef.current = realIdx;
    };

    return (
      <PlayerContext.Provider value={{
        currentSong, queue, queueIndex, isPlaying, currentTime, duration, volume, animStyle, radioMode,
        setAnimStyle, setRadioMode, playSong, togglePlay, nextSong, prevSong, seek, setVolume,
        addToQueue, removeFromQueue, reorderQueue, audioRef,
      }}>
        {children}
      </PlayerContext.Provider>
    );
  }
  