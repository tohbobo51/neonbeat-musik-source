import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronUp, ChevronDown, Square, Activity, Disc3, Heart, ListPlus, ListMusic, X, Plus, Check, Timer, Radio, Download } from 'lucide-react';
import { usePlayer, AnimationStyle } from '../context/PlayerContext';
import QueuePanel from './QueuePanel';
import { useAuth } from '../context/AuthContext';
import { downloadSong } from '../lib/songDownload';

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatCountdown(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function WaveAnimation({ isPlaying }: { isPlaying: boolean }) {
  const bars = 32;
  return (
    <div className="flex items-center justify-center gap-[2px] h-16 w-full">
      {[...Array(bars)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-purple-600 to-pink-400"
          animate={isPlaying ? {
            height: [
              `${8 + Math.sin(i * 0.5) * 20}px`,
              `${20 + Math.sin(i * 0.8 + 1) * 25}px`,
              `${5 + Math.cos(i * 0.6) * 15}px`,
              `${15 + Math.sin(i * 0.4 + 2) * 20}px`,
              `${8 + Math.sin(i * 0.5) * 20}px`,
            ]
          } : { height: '4px' }}
          transition={isPlaying ? {
            duration: 0.8 + (i % 5) * 0.15,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: (i * 0.05) % 0.8,
          } : { duration: 0.3 }}
          style={{ boxShadow: isPlaying ? '0 0 6px rgba(168,85,247,0.8)' : 'none' }}
        />
      ))}
    </div>
  );
}

function VinylAnimation({ coverUrl, isPlaying }: { coverUrl: string; isPlaying: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isPlaying ? { duration: 3, repeat: Infinity, ease: 'linear' } : { duration: 0.5 }}
        className="w-20 h-20 rounded-full relative overflow-hidden shadow-[0_0_30px_rgba(147,51,234,0.6)]"
        style={{
          background: coverUrl
            ? `url(${coverUrl}) center/cover`
            : 'conic-gradient(from 0deg, #1a0030, #9333ea, #1a0030, #c026d3, #1a0030)',
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute inset-0 rounded-full border border-white/5" style={{ margin: `${i * 8}px` }} />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-[#0a0010] border-2 border-purple-500/50 shadow-[0_0_8px_rgba(147,51,234,0.8)]" />
        </div>
      </motion.div>
      {isPlaying && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.3), transparent 70%)' }}
        />
      )}
    </div>
  );
}

const TIMER_OPTIONS = [
  { label: '5 menit', value: 5 * 60 },
  { label: '10 menit', value: 10 * 60 },
  { label: '15 menit', value: 15 * 60 },
  { label: '30 menit', value: 30 * 60 },
  { label: '60 menit', value: 60 * 60 },
];

export default function MusicPlayer() {
  const { currentSong, isPlaying, currentTime, duration, volume, animStyle, radioMode, queue, setAnimStyle, setRadioMode, togglePlay, nextSong, prevSong, seek, setVolume } = usePlayer();
  const { user, isGuest } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [muted, setMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(0.8);

  // Like
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Playlist picker
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [addedPlaylistId, setAddedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);

  // Sleep timer
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (currentSong && user && !isGuest) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, song_id: currentSong.id }),
      }).catch(console.error);
      checkLiked();
    }
  }, [currentSong?.id]);

  // Timer countdown
  useEffect(() => {
    if (timerRemaining === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          if (isPlaying) togglePlay();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRemaining !== null]);

  const startTimer = (seconds: number) => {
    setTimerRemaining(seconds);
    setShowTimerMenu(false);
  };

  const cancelTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRemaining(null);
    setShowTimerMenu(false);
  };

  const checkLiked = async () => {
    if (!user || isGuest || !currentSong) return;
    try {
      const res = await fetch(`/api/likes?user_id=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLiked(data.some((l: any) => l.song_id === currentSong.id));
      }
    } catch {}
  };

  const toggleLike = async () => {
    if (!user || isGuest || !currentSong || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, song_id: currentSong.id }),
      });
      const data = await res.json();
      setLiked(data.liked);
    } catch {}
    setLikeLoading(false);
  };

  const openPlaylistPicker = async () => {
    if (!user || isGuest || !currentSong) return;
    setShowPlaylistPicker(true);
    setAddedPlaylistId(null);
    setShowNewPlaylist(false);
    setNewPlaylistName('');
    setPlaylistLoading(true);
    try {
      const res = await fetch(`/api/playlists?user_id=${user.id}`);
      const data = await res.json();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch {
      setPlaylists([]);
    }
    setPlaylistLoading(false);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!currentSong) return;
    try {
      await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_song', playlist_id: playlistId, song_id: currentSong.id }),
      });
      setAddedPlaylistId(playlistId);
      setTimeout(() => setShowPlaylistPicker(false), 800);
    } catch {}
  };

  const createAndAdd = async () => {
    if (!newPlaylistName.trim() || !user || !currentSong) return;
    setCreatingPlaylist(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, name: newPlaylistName.trim() }),
      });
      const pl = await res.json();
      if (pl?.id) await addToPlaylist(pl.id);
    } catch {}
    setCreatingPlaylist(false);
  };

  if (!currentSong) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const canInteract = !!(user && !isGuest);

  const toggleMute = () => {
    if (muted) { setVolume(prevVol); setMuted(false); }
    else { setPrevVol(volume); setVolume(0); setMuted(true); }
  };

  const handleDownload = async () => {
    if (!currentSong || downloading) return;
    setDownloading(true);
    try {
      await downloadSong(currentSong);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengunduh lagu');
    } finally {
      setDownloading(false);
    }
  };

  const DownloadButton = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
    <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={handleDownload} disabled={downloading}
      className={("transition-all text-purple-300/60 hover:text-purple-300 disabled:opacity-50 " + className)} title="Download lagu" aria-label="Download lagu">
      <Download size={size} className={downloading ? 'animate-pulse' : ''} />
    </motion.button>
  );

  const LikeButton = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
    <motion.button
      whileHover={canInteract ? { scale: 1.15 } : {}}
      whileTap={canInteract ? { scale: 0.85 } : {}}
      onClick={toggleLike}
      disabled={!canInteract || likeLoading}
      className={`transition-all ${canInteract ? 'cursor-pointer' : 'cursor-default opacity-40'} ${className}`}
      title={canInteract ? (liked ? 'Hapus dari Liked' : 'Tambah ke Liked') : 'Login untuk like'}
    >
      <Heart size={size} className={liked ? 'text-pink-500 fill-pink-500' : 'text-purple-300/60 hover:text-pink-400'} />
    </motion.button>
  );

  const PlaylistButton = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
    <motion.button
      whileHover={canInteract ? { scale: 1.15 } : {}}
      whileTap={canInteract ? { scale: 0.85 } : {}}
      onClick={openPlaylistPicker}
      disabled={!canInteract}
      className={`transition-all ${canInteract ? 'cursor-pointer' : 'cursor-default opacity-40'} ${className}`}
      title={canInteract ? 'Tambah ke Playlist' : 'Login untuk menambah ke playlist'}
    >
      <ListPlus size={size} className="text-purple-300/60 hover:text-purple-300" />
    </motion.button>
  );

  return (
    <>
      {/* Playlist Picker Modal */}
      <AnimatePresence>
        {showPlaylistPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowPlaylistPicker(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#12001f] border border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(147,51,234,0.3)]"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/20">
                <div>
                  <p className="text-white font-bold">Tambah ke Playlist</p>
                  <p className="text-purple-300/50 text-xs truncate max-w-[200px]">{currentSong.title}</p>
                </div>
                <button onClick={() => setShowPlaylistPicker(false)} className="text-purple-300/50 hover:text-purple-300 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {playlistLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : playlists.length === 0 && !showNewPlaylist ? (
                  <p className="text-purple-300/40 text-sm text-center py-4">Belum ada playlist</p>
                ) : (
                  playlists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => addToPlaylist(pl.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a0030] hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/30 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {pl.cover_url
                          ? <img src={pl.cover_url} alt="" className="w-full h-full object-cover" />
                          : <ListPlus size={16} className="text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{pl.name}</p>
                        <p className="text-purple-300/40 text-xs">{pl.song_count || 0} lagu</p>
                      </div>
                      {addedPlaylistId === pl.id && <Check size={16} className="text-green-400 flex-shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              <div className="px-4 pb-4">
                {showNewPlaylist ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newPlaylistName}
                      onChange={e => setNewPlaylistName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createAndAdd()}
                      placeholder="Nama playlist baru..."
                      className="flex-1 bg-[#1a0030] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-sm placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
                    />
                    <button onClick={createAndAdd} disabled={creatingPlaylist || !newPlaylistName.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white text-sm font-semibold disabled:opacity-50">
                      {creatingPlaylist ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                    </button>
                    <button onClick={() => setShowNewPlaylist(false)} className="px-3 py-2 border border-purple-500/30 rounded-xl text-purple-300/60 hover:text-purple-300">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewPlaylist(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-purple-500/30 rounded-xl text-purple-300/60 hover:text-purple-300 hover:border-purple-400 transition-all text-sm">
                    <Plus size={16} /> Buat Playlist Baru
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Player */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-50 bg-[#0a0010]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
          >
            {/* Top bar */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
              {/* Animation Selector */}
              <div className="flex gap-2">
                {([['static', Square], ['wave', Activity], ['vinyl', Disc3]] as [AnimationStyle, any][]).map(([style, Icon]) => (
                  <button key={style} onClick={() => setAnimStyle(style)}
                    className={`p-2 rounded-lg transition-all ${
                      animStyle === style ? 'bg-purple-500/30 text-purple-300 shadow-[0_0_10px_rgba(147,51,234,0.4)]' : 'text-purple-300/40 hover:text-purple-300'
                    }`}>
                    <Icon size={18} />
                  </button>
                ))}
              </div>

              {/* Right: Timer + Close */}
              <div className="flex items-center gap-2">
                {/* Sleep Timer */}
                <div className="relative">
                  <button
                    onClick={() => setShowTimerMenu(v => !v)}
                    className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${
                      timerRemaining !== null
                        ? 'bg-purple-500/30 text-purple-300 shadow-[0_0_10px_rgba(147,51,234,0.4)]'
                        : 'text-purple-300/40 hover:text-purple-300'
                    }`}
                    title="Timer tidur"
                  >
                    <Timer size={18} />
                    {timerRemaining !== null && (
                      <span className="text-xs font-bold tabular-nums">{formatCountdown(timerRemaining)}</span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showTimerMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -8 }}
                        className="absolute top-full right-0 mt-2 w-40 bg-[#12001f] border border-purple-500/30 rounded-xl shadow-[0_0_30px_rgba(147,51,234,0.3)] overflow-hidden z-10"
                      >
                        {timerRemaining !== null && (
                          <button onClick={cancelTimer}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors border-b border-purple-500/20">
                            Batalkan Timer
                          </button>
                        )}
                        {TIMER_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => startTimer(opt.value)}
                            className="w-full px-4 py-2.5 text-left text-sm text-purple-300 hover:bg-purple-500/10 transition-colors">
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button onClick={() => setExpanded(false)} className="text-purple-300/60 hover:text-purple-300 p-2">
                  <ChevronDown size={24} />
                </button>
              </div>
            </div>

            <div className="w-full max-w-sm text-center">
              {/* Animation Display */}
              <div className="mb-8">
                {animStyle === 'static' && (
                  <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(147,51,234,0.5)] border border-purple-500/30">
                    {currentSong.cover_url ? (
                      <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                        <Disc3 size={64} className="text-purple-400" />
                      </div>
                    )}
                  </div>
                )}
                {animStyle === 'wave' && <WaveAnimation isPlaying={isPlaying} />}
                {animStyle === 'vinyl' && <VinylAnimation coverUrl={currentSong.cover_url} isPlaying={isPlaying} />}
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">{currentSong.title}</h2>
              <p className="text-purple-300/70 mb-2">{currentSong.profiles?.username || currentSong.artist_name}</p>
              {currentSong.genres && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6"
                  style={{ background: `${currentSong.genres.color}30`, color: currentSong.genres.color, border: `1px solid ${currentSong.genres.color}50` }}>
                  {currentSong.genres.name}
                </span>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div className="w-full h-2 bg-purple-900/50 rounded-full cursor-pointer group relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seek(((e.clientX - rect.left) / rect.width) * duration);
                  }}
                >
                  <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full relative" style={{ width: `${progress}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(147,51,234,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                </div>
                <div className="flex justify-between text-xs text-purple-300/50 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls — Like | Prev | Play | Next | Playlist */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <LikeButton size={22} />
                <button onClick={prevSong} className="text-purple-300/70 hover:text-purple-300 transition-colors">
                  <SkipBack size={24} />
                </button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_25px_rgba(147,51,234,0.6)]">
                  {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
                </motion.button>
                <button onClick={nextSong} className="text-purple-300/70 hover:text-purple-300 transition-colors">
                  <SkipForward size={24} />
                </button>
                <PlaylistButton size={22} />
                <DownloadButton size={22} />
                <motion.button
                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                  onClick={() => setShowQueue(v => !v)}
                  className={`transition-all relative ${showQueue ? 'text-purple-300' : 'text-purple-300/60 hover:text-purple-300'}`}
                  title="Antrian"
                >
                  <ListMusic size={22} />
                  {queue.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center">{queue.length > 9 ? '9+' : queue.length}</span>
                  )}
                </motion.button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="text-purple-300/60 hover:text-purple-300">
                  {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="flex-1 accent-purple-500 cursor-pointer" />
              </div>

              {/* Radio Mode Toggle */}
              <div className="mt-4 flex justify-center">
                <button onClick={() => setRadioMode(!radioMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                    radioMode
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(147,51,234,0.3)]'
                      : 'border-purple-500/20 text-purple-300/40 hover:border-purple-500/40 hover:text-purple-300/70'
                  }`}>
                  <Radio size={15} />
                  Radio Mode {radioMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QueuePanel open={showQueue} onClose={() => setShowQueue(false)} />

      {/* Mini Player */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        className="fixed left-0 right-0 z-40 bg-[#0d0018]/95 backdrop-blur-xl border-t border-purple-500/20 px-4 py-3 md:bottom-0 bottom-14"
      >
        <div className="w-full h-1 bg-purple-900/40 rounded-full mb-3 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * duration);
          }}
        >
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <button onClick={() => setExpanded(true)} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-purple-500/30">
              {currentSong.cover_url ? (
                <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                  <Disc3 size={16} className="text-purple-400" />
                </div>
              )}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-white text-sm font-semibold truncate">{currentSong.title}</p>
              <p className="text-purple-300/60 text-xs truncate">{currentSong.profiles?.username || currentSong.artist_name}</p>
            </div>
            <ChevronUp size={16} className="text-purple-300/60 flex-shrink-0" />
          </button>

          {/* Controls — Like | Prev | Play | Next | Playlist */}
          <div className="flex items-center gap-2">
            <LikeButton size={17} />
            <button onClick={prevSong} className="text-purple-300/60 hover:text-purple-300"><SkipBack size={18} /></button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.5)]">
              {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
            </motion.button>
            <button onClick={nextSong} className="text-purple-300/60 hover:text-purple-300"><SkipForward size={18} /></button>
            <PlaylistButton size={17} />
            <DownloadButton size={17} />
            <motion.button
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
              onClick={() => setShowQueue(v => !v)}
              className={`transition-all relative ${showQueue ? 'text-purple-300' : 'text-purple-300/60 hover:text-purple-300'}`}
              title="Antrian"
            >
              <ListMusic size={17} />
              {queue.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 text-white text-[8px] font-bold flex items-center justify-center">{queue.length > 9 ? '9+' : queue.length}</span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
