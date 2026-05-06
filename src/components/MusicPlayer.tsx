import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronUp, ChevronDown, Square, Activity, Disc3 } from 'lucide-react';
import { usePlayer, AnimationStyle } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
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
        {/* Vinyl grooves */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border border-white/5"
            style={{ margin: `${i * 8}px` }}
          />
        ))}
        {/* Center hole */}
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

export default function MusicPlayer() {
  const { currentSong, isPlaying, currentTime, duration, volume, animStyle, setAnimStyle, togglePlay, nextSong, prevSong, seek, setVolume } = usePlayer();
  const { user, isGuest } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(0.8);

  useEffect(() => {
    if (currentSong && user && !isGuest) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, song_id: currentSong.id }),
      }).catch(console.error);
    }
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const toggleMute = () => {
    if (muted) { setVolume(prevVol); setMuted(false); }
    else { setPrevVol(volume); setVolume(0); setMuted(true); }
  };

  return (
    <>
      {/* Expanded Player */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-50 bg-[#0a0010]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
          >
            <button onClick={() => setExpanded(false)} className="absolute top-6 right-6 text-purple-300/60 hover:text-purple-300">
              <ChevronDown size={28} />
            </button>

            {/* Animation Selector */}
            <div className="absolute top-6 left-6 flex gap-2">
              {([['static', Square], ['wave', Activity], ['vinyl', Disc3]] as [AnimationStyle, any][]).map(([style, Icon]) => (
                <button key={style} onClick={() => setAnimStyle(style)}
                  className={`p-2 rounded-lg transition-all ${
                    animStyle === style ? 'bg-purple-500/30 text-purple-300 shadow-[0_0_10px_rgba(147,51,234,0.4)]' : 'text-purple-300/40 hover:text-purple-300'
                  }`}>
                  <Icon size={18} />
                </button>
              ))}
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
              <p className="text-purple-300/70 mb-2">{currentSong.artist_name}</p>
              {currentSong.genres && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6"
                  style={{ background: `${currentSong.genres.color}30`, color: currentSong.genres.color, border: `1px solid ${currentSong.genres.color}50` }}>
                  {currentSong.genres.name}
                </span>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div
                  className="w-full h-2 bg-purple-900/50 rounded-full cursor-pointer group relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seek(((e.clientX - rect.left) / rect.width) * duration);
                  }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(147,51,234,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                </div>
                <div className="flex justify-between text-xs text-purple-300/50 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <button onClick={prevSong} className="text-purple-300/70 hover:text-purple-300 transition-colors">
                  <SkipBack size={24} />
                </button>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_25px_rgba(147,51,234,0.6)]"
                >
                  {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
                </motion.button>
                <button onClick={nextSong} className="text-purple-300/70 hover:text-purple-300 transition-colors">
                  <SkipForward size={24} />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="text-purple-300/60 hover:text-purple-300">
                  {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="flex-1 accent-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Player — sits above bottom nav on mobile (bottom-nav is h-14 = 56px) */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        className="fixed left-0 right-0 z-40 bg-[#0d0018]/95 backdrop-blur-xl border-t border-purple-500/20 px-4 py-3 md:bottom-0 bottom-14"
      >
        <div
          className="w-full h-1 bg-purple-900/40 rounded-full mb-3 cursor-pointer"
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
              <p className="text-purple-300/60 text-xs truncate">{currentSong.artist_name}</p>
            </div>
            <ChevronUp size={16} className="text-purple-300/60 flex-shrink-0" />
          </button>

          <div className="flex items-center gap-3">
            <button onClick={prevSong} className="text-purple-300/60 hover:text-purple-300"><SkipBack size={18} /></button>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.5)]"
            >
              {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
            </motion.button>
            <button onClick={nextSong} className="text-purple-300/60 hover:text-purple-300"><SkipForward size={18} /></button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
